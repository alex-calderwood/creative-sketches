import '/editors/assets/lib/html2canvas.min.js'


/**
 * Capture a screenshot of an element
 * @param {string} selector - CSS selector for the element to capture
 * @returns {Promise<string>} Data URL of the screenshot (PNG format)
 */
export async function captureScreenshot(element) {
  if (!element) {
    console.warn('Element not found for captureScreenshot');
    return null;
  }

  let data = null;
  try {
    const canvas = await html2canvas(element, {
      // backgroundColor: null,
      // scale: 1,
      removeContainer: false,
      logging: true
    });

    data = canvas.toDataURL('image/png');

  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return null;
  }

  return data

}