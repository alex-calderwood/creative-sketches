let userX = 0;
let userY = 0;
const updateInterval = 100; //ms

const editor = document.getElementById('editor');
let ghosts = {}

function uuid() {
  return 'id-' + Math.random().toString(36).substr(2, 9);
}

function updateOffsets() {
    check();
    renderGhosts()
    setTimeout(updateOffsets, updateInterval);
}

function check() {
    document.querySelectorAll('.duplicate-the').forEach(el => el.remove());

    let word = 'the';
    
    // Find all occurrences of "the" in the text
    const userText = editor.textContent;
    const regex = /\bthe\b/gi;
    let match;
    
    const range = document.createRange();
    
    while ((match = regex.exec(userText)) !== null) {
        try {
            const startNode = getTextNodeAtPosition(editor, match.index);
            const endNode = getTextNodeAtPosition(editor, match.index + 3);
            
            if (startNode.node && endNode.node) {
                range.setStart(startNode.node, startNode.position);
                range.setEnd(endNode.node, endNode.position);
                
                const rect = range.getBoundingClientRect();

                const ghost = {
                    rect,
                    text: word,
                    id: uuid()
                }
                ghosts[ghost.id] = ghost;
            }
        } catch (e) {
            console.error('Error processing match:', e);
        }
    }
}

function markup(ghost) {
    // if the ghost has already been rendered in the same spot, continue
    let existingGhost = document.querySelector(`#${ghost.id}`);
    if (existingGhost) {
        if (existingGhost.rect.left === ghost.rect.left && existingGhost.rect.top === ghost.rect.top) {
            return;
        } else {
            existingGhost.remove();
        }
    }

    // Add a new piece of text on top of the old
    const duplicate = document.createElement('span');
    duplicate.textContent = ghost.text;
    duplicate.className = 'duplicate-the';
    
    let left = ghost.rect.left - editor.getBoundingClientRect().left;
    duplicate.style.left = left + 'px';
    duplicate.style.top = (ghost.rect.top - editor.getBoundingClientRect().top) + 'px';
    
    editor.appendChild(duplicate);

    // Add a squiggly autocorrect line beneath the old
    // https://answers.microsoft.com/en-us/msoffice/forum/all/what-is-the-real-name-for-the-red-squiggly-line/47505770-f399-409d-9519-6606efcb6e87
    const squiggle = document.createElement('div');
    squiggle.className = 'squiggle';
    squiggle.style.left = ghost.rect.left + 'px';
    squiggle.style.top = (ghost.rect.top + ghost.rect.height) + 'px';
    squiggle.style.width = ghost.rect.width + 'px';
    editor.appendChild(squiggle);

}

function renderGhosts() {
    Object.values(ghosts).forEach(ghost => {
        markup(ghost)
    })
}

function getTextNodeAtPosition(root, index) {
    const treeWalker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let currentIndex = 0;
    let currentNode = treeWalker.nextNode();
    
    while (currentNode) {
        if (currentIndex + currentNode.length > index) {
            return {
                node: currentNode,
                position: index - currentIndex
            };
        }
        
        currentIndex += currentNode.length;
        currentNode = treeWalker.nextNode();
    }
    
    return { node: null, position: 0 };
}

editor.addEventListener('input', check);

updateOffsets();

editor.innerHTML = "";
check();