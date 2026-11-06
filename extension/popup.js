const select = document.getElementById('language');

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

chrome.storage.local.get('language').then(({ language }) => {
  select.value = language || browserLanguage();
});
