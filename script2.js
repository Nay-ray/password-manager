// script.js

const vaultKeyAlgo = { name: "AES-GCM", length: 256 };
const keyDeriveAlgo = {
  name: "PBKDF2",
  hash: "SHA-256",
  iterations: 100000
};

let vault = [];
let cryptoKey = null;

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let pwd = '';
  for (let i = 0; i < 16; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  document.getElementById('generatedPassword').value = pwd;
}

async function unlockVault() {
  const pass = document.getElementById('masterPassword').value;
  const encVault = localStorage.getItem('vault');
  cryptoKey = await getKeyFromPassword(pass);
  if (encVault) {
    try {
      const decrypted = await decryptVault(encVault, cryptoKey);
      vault = JSON.parse(decrypted);
      renderVault();
    } catch {
      alert("Incorrect password or corrupted vault");
    }
  } else {
    vault = [];
    renderVault();
  }
}

async function savePassword() {
  if (!cryptoKey) return alert("Unlock vault first");
  const label = document.getElementById('accountLabel').value;
  const pwd = document.getElementById('generatedPassword').value;
  vault.push({ label, pwd });
  await saveVault();
  renderVault();
}

async function saveVault() {
  const data = JSON.stringify(vault);
  const enc = await encryptVault(data, cryptoKey);
  localStorage.setItem('vault', enc);
}

function renderVault() {
  const list = document.getElementById('vault-entries');
  list.innerHTML = '';
  vault.forEach(({ label, pwd }) => {
    const div = document.createElement('div');
    div.className = 'entry';
    div.textContent = `${label}: ${pwd}`;
    list.appendChild(div);
  });
}

async function getKeyFromPassword(password) {
  const enc = new TextEncoder();
  const salt = enc.encode("vault-salt");
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { ...keyDeriveAlgo, salt },
    keyMaterial,
    vaultKeyAlgo,
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptVault(plainText, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plainText));
  const vaultData = { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
  return JSON.stringify(vaultData);
}

async function decryptVault(raw, key) {
  const vaultData = JSON.parse(raw);
  const iv = new Uint8Array(vaultData.iv);
  const data = new Uint8Array(vaultData.data);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

function exportVault() {
  if (!cryptoKey || vault.length === 0) return alert("Unlock and save entries first");
  const encVault = localStorage.getItem('vault');
  const blob = new Blob([encVault], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'vault.json';
  link.click();
}

function importVault() {
  document.getElementById('vaultFile').click();
}

function readVaultFile(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = async function(e) {
    const data = e.target.result;
    localStorage.setItem('vault', data);
    unlockVault();
  };
  reader.readAsText(file);
}
