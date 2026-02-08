/**
 * Checks if delete button should be displayed based on current mode.
 * In preset modes (ecb, cbc, ctr), nodes are locked and cannot be deleted.
 * In free mode, nodes can be freely deleted.
 * 
 * @param {string} mode - Current mode from node data
 * @returns {string} - CSS display value: 'none' or 'block'
 */
export function checkModeForDeleteButton(mode) {
  // Hide delete button in preset modes (ecb, cbc, ctr)
  if (mode === 'ecb' || mode === 'cbc' || mode === 'ctr') {
    return 'none';
  }
  return 'block'; // Show in 'free' mode
}
