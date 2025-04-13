function toggleDrawer(type) {
    const layout = document.querySelector('.drawer-layout');
    const isOpen = layout.classList.contains(type + '-open');
    
    // For side drawers, close both first
    if (type === 'left' || type === 'right') {
        layout.classList.remove('left-open', 'right-open');
    }

    // For top and bottom drawers, close both first
    if (type === 'top' || type === 'bottom') {
        layout.classList.remove('top-open', 'bottom-open');
    }
    
    // If it wasn't already open, open it
    if (!isOpen) {
        layout.classList.add(type + '-open');
    }
}