export const showToast = (message) => {
  window.dispatchEvent(new CustomEvent('showToast', { detail: message }));
};
