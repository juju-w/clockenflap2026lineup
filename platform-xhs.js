/* Offline container capabilities: no clipboard API, downloads or external navigation. */
window.CF_PLATFORM = {
  target: 'xhs',
  copyText: async function(input) { input.focus(); input.select(); return 'fallback'; },
  saveImage: async function(blob) {
    var bridge = window.xhs && window.xhs.miniTool;
    if (!bridge || !bridge.writeTempFile || !bridge.saveImageToPhotosAlbum) throw new Error('Album saving is unavailable in this container.');
    var uri = await new Promise(function(resolve, reject) {
      var reader = new FileReader(); reader.onload = function() { resolve(reader.result); };
      reader.onerror = function() { reject(reader.error); }; reader.readAsDataURL(blob);
    });
    var result = await bridge.writeTempFile({data: uri});
    await bridge.saveImageToPhotosAlbum({filePath: result.filePath});
  },
  /* share: client 9.53+, full-screen container only. Method presence is checked here;
     the caller gates on client version via CF_CAP and hides the entry when unsupported. */
  canShare: function() {
    var bridge = window.xhs && window.xhs.miniTool;
    return !!(bridge && typeof bridge.share === 'function');
  },
  shareCard: async function() {
    var bridge = window.xhs && window.xhs.miniTool;
    if (!bridge || typeof bridge.share !== 'function') throw new Error('Share is unavailable in this container.');
    await bridge.share({type: 'card'});
  },
  shareImage: async function(dataUrl) {
    var bridge = window.xhs && window.xhs.miniTool;
    if (!bridge || typeof bridge.share !== 'function') throw new Error('Share is unavailable in this container.');
    await bridge.share({type: 'image', image_resource: dataUrl});
  }
};
