(function () {
  var allowed = ['harbor', 'paper', 'night'];
  var chosen = new URLSearchParams(location.search).get('theme');
  if (!allowed.includes(chosen)) {
    try { chosen = localStorage.getItem('handover-theme-v1'); } catch (_) {}
  }
  document.documentElement.dataset.theme = allowed.includes(chosen) ? chosen : 'night';
}());
