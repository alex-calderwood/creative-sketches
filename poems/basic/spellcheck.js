// Fetch configuration from JSON file
let config;
console.log('Starting to fetch config...');
fetch('config.json')
    .then(response => {
        console.log('Response received:', response);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Config loaded:', data);
        config = data;
        // Create and animate all letters
        config.letters.forEach(letterConfig => {
            // Create the letter element
            const letter = document.createElement('div');
            letter.textContent = letterConfig.text;
            letter.className = 'letter';

            // Set the transform origin point
            letter.style.transformOrigin = `${letterConfig.originX * 100}% ${letterConfig.originY * 100}%`;
            // Start at position with scale 0
            letter.style.transform = `translate(${letterConfig.x}px, ${letterConfig.y}px) scale(0)`;

            // Add to container
            const container = document.getElementById('container');
            if (!container) {
                console.error('Container element not found!');
                return;
            }
            container.appendChild(letter);

            // Start animation after delay
            setTimeout(() => {
                let startTime = null;
                function animate(timestamp) {
                    if (!startTime) startTime = timestamp;
                    const progress = Math.min((timestamp - startTime) / letterConfig.duration, 1);
                    
                    // Animate from scale 0 to 1 while maintaining position
                    letter.style.transform = `translate(${letterConfig.x}px, ${letterConfig.y}px) scale(${progress})`;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                }

                requestAnimationFrame(animate);
            }, letterConfig.delay);
        });
    })
    .catch(error => console.error('Error loading configuration:', error));