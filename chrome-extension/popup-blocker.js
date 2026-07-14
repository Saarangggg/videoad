(function() {
  const originalOpen = window.open;
  window.open = function(url, name, specs, replace) {
    const isAdBlockActive = document.documentElement.getAttribute('data-videoad-adblock') === 'true';
    if (isAdBlockActive) {
      const isAdPattern = url && (
        url.includes('onclickads') || 
        url.includes('popads') || 
        url.includes('popcash') || 
        url.includes('adsterra') ||
        url.includes('exoclick') ||
        url.includes('exdynsrv') ||
        url.includes('propellerads')
      );
      if (isAdPattern) {
        console.log("[VideoAd] Blocked ad popup: " + url);
        return null;
      }
    }
    return originalOpen.apply(this, arguments);
  };
})();
