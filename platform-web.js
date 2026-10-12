/* Browser-only capabilities. This file is excluded from the Xiaohongshu bundle. */
window.CF_PLATFORM = {
  target: 'web',
  copyText: async function(input) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(input.value); return 'success'; } catch (e) {}
    }
    input.focus(); input.select(); return 'fallback';
  },
  saveImage: async function(blob, filename) {
    var url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }
};
