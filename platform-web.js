/* Browser-only capabilities. This file is excluded from the Xiaohongshu bundle. */
window.CF_PLATFORM = {
  target: 'web',
  openListening: function(url) { window.open(url, '_blank', 'noopener,noreferrer'); },
  copyText: async function(input) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(input.value); return 'success'; } catch (e) {}
    }
    input.focus(); input.select(); return 'fallback';
  },
  canShareFile: function(blob, filename) {
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function' || typeof File !== 'function') return false;
    return navigator.canShare({files: [new File([blob], filename, {type: 'image/png'})]});
  },
  shareFile: function(blob, filename) {
    return navigator.share({files: [new File([blob], filename, {type: 'image/png'})], title: 'My Clockenflap 2026'});
  },
  saveImage: async function(blob, filename) {
    var url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }
};

/* Repository navigation belongs to the website, not the offline container. */
(function(){
  var actions=document.querySelector('.rail-actions');if(!actions)return;
  var link=document.createElement('a');link.className='repository-link';
  link.href='https://github.com/juju-w/clockenflap2026lineup';
  link.target='_blank';link.rel='noopener noreferrer';
  link.setAttribute('aria-label','GitHub');
  link.innerHTML='GitHub <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
  actions.insertBefore(link,actions.firstChild);
}());
