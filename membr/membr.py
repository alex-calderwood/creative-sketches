#!/usr/bin/env python3
import os
import sys
import tty
import termios
import time
import random
import select
import signal

def get_key():
    """Get a single keypress from the user."""
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    try:
        tty.setraw(sys.stdin.fileno())
        ch = sys.stdin.read(1)
        # Check for Control-C
        if ord(ch) == 3:
            raise KeyboardInterrupt
        # Check for escape sequences (arrow keys)
        if ch == '\x1b':
            ch += sys.stdin.read(2)
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
    return ch

def clear_screen():
    """Clear the terminal screen."""
    os.system('cls' if os.name == 'nt' else 'clear')

def move_cursor_to_top():
    """Move cursor to top of screen and clear everything below."""
    print('\033[H\033[J', end='')  # Move to top-left corner and clear screen below cursor

def make_progress(linelen, poem_lines, to_memorize, progress):
    """Draw the progress bar with error markers."""
    progress_bar = ''
    
    for i in range(linelen):
        start_line = int((i * len(poem_lines)) / linelen)
        end_line = int(((i + 1) * len(poem_lines)) / linelen)
        
        # Check if any line in the range needs memorization
        has_error = any(line in to_memorize for line in range(start_line, end_line + 1))
        
        if i == progress - 1:
            progress_bar += '█' if progress > 0 and progress < linelen else ' '
        else:
            # Only show error marker at start of error section
            progress_bar += '░' if has_error else ' '
    
    return progress_bar

def display_poem(poem_lines, index, checkpoints, to_memorize, checkpoint_index, memorized):
    # Get terminal width and compute line length
    terminal_width = os.get_terminal_size().columns
    
    if poem_lines:
        # Calculate fixed elements first
        stats = f" {index}/{len(poem_lines)}"
        percent_text = f" {(len(memorized) / len(poem_lines)) * 100:.1f}%"
        # Line length is what's left after borders and stats
        linelen = terminal_width - len(stats) - 4  # 4 for "█ " and " █"
        
        move_cursor_to_top()
        
        # Center the ASCII art title
        title_lines = [
            "█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█",
            "█  █▄ ▄█ █▀▀▀█ █▄ ▄█ █▀▀▀█ █▀▀█▄   █",
            "█  █ █ █ █▀▀▀▀ █ █ █ █▀▀▀▄ █▀▀▄    █",
            "█  █   █ █▄▄▄▄ █   █ █▄▄▄█ █   █   █",
            "█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█",
            "█                                  █",
            "█          CABARET EDITION         █",
            "█                                  █",
            "█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█"
        ]
        
        # Print centered ASCII art
        print()  # Initial spacing
        for line in title_lines:
            padding = (terminal_width - len(line)) // 2
            print(" " * padding + line)
        print()
        
        # Full-width controls header
        header_text = " CONTROLS "
        fill_char = "▀"
        left_padding = (terminal_width - len(header_text)) // 2
        right_padding = terminal_width - left_padding - len(header_text)
        
        print(f"█{fill_char * (left_padding - 1)}{header_text}{fill_char * (right_padding - 1)}█")

        controls = ["directions: press f/s to mark failure/success",
                    "",
                    "f failure   s success",
                    "< prev checkpoint   > next checkpoint",
                    "^ prev line   v next line",
                    "c toggle checkpoint",
                    "r reset  q quit"]
        for control in controls:
            print(f"█{control.center(terminal_width-2)}█")
        print(f"█{'▄' * (terminal_width-2)}█")
        
        # Progress section with full-width header
        progress_text = " PROGRESS "
        print(f"█{fill_char * (left_padding - 1)}{progress_text}{fill_char * (right_padding - 1)}█")
        
        progress = int(index / len(poem_lines) * linelen)
        progress_bar = make_progress(linelen, poem_lines, to_memorize, progress)
        
        # Pad the progress bar lines to full terminal width
        padding = terminal_width - len(progress_bar) - len(stats) - 3
        print(f"█{progress_bar}{' ' * padding}{stats} █")
        
        # Memorization progress bar
        percent_memorized = (len(memorized) / len(poem_lines)) * 100
        mem_progress = int(percent_memorized * linelen / 100)
        mem_bar = ('█' * mem_progress) + ('░' * (linelen-mem_progress))
        padding = terminal_width - len(mem_bar) - len(percent_text) - 3  # 3 for "█ " and " █"
        print(f"█{mem_bar}{' ' * padding}{percent_text} █")
        print(f"█{'▄' * (terminal_width-2)}█")
    
    # Full-width divider
    # print("█" * terminal_width + "\n")
    
    # Display all lines up to but not including index
    for i in range(index):
        if i < len(poem_lines):
            prefix = "    "  # default prefix
            if i in to_memorize and i in checkpoints:
                prefix = ".!  "
            elif i in to_memorize:
                prefix = "!   "  # always show ! for lines needing memorization
            elif i in checkpoints:
                prefix = ".   "  # only show . if not needing memorization
            print(f"{prefix}{poem_lines[i]}")

    print(f">   ")

def win():
    clear_screen()
    full_poem = "YOU MEMBR'D! "
    
    # Setup non-blocking input and handle Ctrl+C properly
    signal.signal(signal.SIGINT, signal.default_int_handler)
    original_settings = termios.tcgetattr(sys.stdin.fileno())
    
    try:
        # Set terminal to raw mode
        tty.setraw(sys.stdin.fileno())
        
        i = 0
        while True:
            # Check for key press - simple direct check
            if select.select([sys.stdin], [], [], 0)[0]:
                # Check if it's Control-C (ASCII value 3) exit the entire program
                key = sys.stdin.read(1) 
                if ord(key) == 3:
                    raise KeyboardInterrupt
                break
            
            char = full_poem[i % len(full_poem)]
            print(char, end='', flush=True)
            
            time.sleep(0.0007)
            i += 1
            
    except KeyboardInterrupt:
        # Properly handle the KeyboardInterrupt
        raise
    except Exception as e:
        print(f"\nError in endless mode: {e}")
    finally:
        # Always reset terminal settings
        termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, original_settings)


def handle_exit():
    """Clean up terminal settings on exit."""
    clear_screen()
    print("Program terminated.")
    try:
        os.system('stty sane')
    except:
        try:
            # Last resort if terminal state is corrupted
            os.system('reset')
        except:
            pass
    print("\nExited MEMBR.")
    sys.exit(0)

def main():
    # Determine the poem file path
    if len(sys.argv) > 1:
        poem_file = sys.argv[1]
    else:
        poem_file = "poem.txt"
    
    try:
        # Read the poem from file
        with open(poem_file, 'r') as file:
            poem = file.read()
    except FileNotFoundError:
        print(f"Error: The poem file '{poem_file}' was not found.")
        return
    
    # Split the poem into lines
    poem_lines = poem.strip().split('\n')
    total_lines = len(poem_lines)
    
    
    if total_lines == 0:
        print("Error: The poem file is empty.")
        return
    
    # Initialize positions
    index = 0  # Current line index (the line we're trying to memorize)
    checkpoints = [0]  # List of checkpoints, starting with line 0
    checkpoint_index = 0  # Current checkpoint index
    
    # Initialize tracking sets
    to_memorize = set(range(total_lines))  # Lines that need work
    memorized = set()  # Lines that have been successfully memorized
    
    # Define arrow key escape sequences
    UP_ARROW = '\x1b[A'
    DOWN_ARROW = '\x1b[B'
    RIGHT_ARROW = '\x1b[C'
    LEFT_ARROW = '\x1b[D'
    
    # Clear screen once at program start
    clear_screen()
    
    # First display
    display_poem(poem_lines, index, checkpoints, to_memorize, checkpoint_index, memorized)
    
    # Main navigation loop
    while True:
        # Get key press
        key = get_key()
        prev = index - 1
        prevprev = index - 2

        do_continue = False
        succeeded = False
        failed = False
        
        # Check for quit
        if key.lower() == 'q':
            break
            
        # Check for checkpoint creation
        elif key.lower() == 'c' or key.lower() == '.':
            # Don't allow removing the first checkpoint (index 0)
            if prev == 0:
                continue
                
            # Toggle checkpoint
            if prev in checkpoints:
                checkpoints.remove(prev)
                # Update checkpoint_index to previous checkpoint
                checkpoint_index = max(0, checkpoints.index(max(cp for cp in checkpoints if cp < prev)))
            else:
                checkpoints.append(prev)
                checkpoints.sort()  # Keep checkpoints in order
                checkpoint_index = checkpoints.index(prev)
        
        # Reset all checkpoints and memorization status
        elif key.lower() == 'r':
            checkpoints = [0]
            checkpoint_index = 0
            index = 0
            # to_memorize = set(range(total_lines))
            # memorized = set()  # Clear memorized set on reset
        
        # Mark current line as not learned yet (toggle)
        elif key.lower() == 'f':
            succeeded = False
            failed = True
            # do_continue = True

        elif key.lower() == 's':
            succeeded = True
            failed = False
            # do_continue = True
        
        # Handle arrow keys
        elif key == DOWN_ARROW:
            do_continue = True
        
        elif key == UP_ARROW:
            index = (index - 1) % total_lines
        
        elif key == LEFT_ARROW:
            # Go to most recent checkpoint
            # Find the most recent checkpoint (largest one) that is smaller than index
            recent_checkpoints = [cp for cp in checkpoints if cp < index]
            if recent_checkpoints:
                index = max(recent_checkpoints)
                checkpoint_index = checkpoints.index(index)
        
        elif key == RIGHT_ARROW:
            # Go to next checkpoint
            if checkpoint_index < len(checkpoints) - 1:
                checkpoint_index += 1
                index = checkpoints[checkpoint_index]

        if succeeded:
            if prev in to_memorize:
                to_memorize.remove(prev)
                memorized.add(prev)
        elif failed:
            if prev in memorized:
                memorized.remove(prev)
                to_memorize.add(prev)

        if do_continue:
            # Check if we can move forward
            if index < total_lines: 
               index += 1

            if index == total_lines and len(to_memorize) == 0: # win
                # All memorized! Enter endless mode
                win()
                display_poem(poem_lines, index, checkpoints, to_memorize, checkpoint_index, memorized)
                continue
            if index == total_lines and len(to_memorize) > 0:
                # display a message and go to the first line
                index = 0
                checkpoint_index = 0
        
        # Update display after each keypress
        display_poem(poem_lines, index, checkpoints, to_memorize, checkpoint_index, memorized)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        clear_screen()
        print(f"Program error: {e}")
    finally:
        handle_exit()
