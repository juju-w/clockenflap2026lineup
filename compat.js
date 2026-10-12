/* Small, feature-based fallbacks; classic ES2017 script, no network dependencies. */
(function() {
  var flex=document.createElement('div');
  flex.style.cssText='position:absolute;visibility:hidden;display:flex;flex-direction:column;row-gap:1px;';
  flex.appendChild(document.createElement('div'));flex.appendChild(document.createElement('div'));
  document.body.appendChild(flex);
  document.documentElement.classList.toggle('no-flex-gap',flex.scrollHeight!==1);
  flex.parentNode.removeChild(flex);
  window.CF_COMPAT={focusVisible:function(node){try{return node.matches(':focus-visible');}catch(e){return true;}}};
}());
