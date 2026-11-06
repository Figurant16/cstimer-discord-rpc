const select = document.getElementById('language');
const toggle = document.getElementById('enabled');

for (const { code, name } of LANGUAGES) {
  const option = document.createElement('option');
  option.value = code;
  option.textContent = name;
  select.append(option);
}

function browserLanguage() {
  const code = chrome.i18n.getUILanguage().slice(0, 2).toLowerCase();
  return LANGUAGES.some((language) => language.code === code) ? code : 'en';
}

select.addEventListener('change', () => chrome.storage.local.set({ language: select.value }));
toggle.addEventListener('change', () => chrome.storage.local.set({ enabled: toggle.checked }));

chrome.storage.local.get(['language', 'enabled']).then(({ language, enabled = true }) => {
  select.value = language || browserLanguage();
  toggle.checked = enabled;
});
