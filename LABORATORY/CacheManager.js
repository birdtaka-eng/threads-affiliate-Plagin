/**
 * CacheManager.js
 * Gemini Context Caching 管理エンジン (GEM-ification)
 * 役割：高コストなDNAプロンプトをGoogle側に保持し、指示の永続性と高速化を実現する。
 */

/**
 * 有効なキャッシュID（引換券）を取得または作成する
 * @param {string} personaKey - 'A' または 'B'
 * @returns {string} キャッシュ名 (cachedContents/xxx)
 */
function getEffectiveCacheId(personaKey) {
  const soulText = getPersonaSoul(personaKey);
  const dnaHash = getDNAHash_(soulText);
  
  const props = PropertiesService.getScriptProperties();
  const savedHash = props.getProperty("LAST_DNA_HASH_" + personaKey);
  const savedCacheName = props.getProperty("CACHE_NAME_" + personaKey);
  const savedExpireTime = props.getProperty("CACHE_EXPIRE_" + personaKey);

  // 1. ハッシュが一致し、かつ期限内であれば再利用
  if (savedHash === dnaHash && savedCacheName && savedExpireTime) {
    const now = new Date().getTime();
    const sheet = ss.getSheetByName(SHEET_SETTINGS);
    if (now < Number(savedExpireTime)) {
      console.log(`[CacheManager] Reusing existing cache for Persona ${personaKey}: ${savedCacheName}`);
      return savedCacheName;
    }
  }

  // 2. 新規作成または更新
  console.log(`[CacheManager] Creating new GEM-cache for Persona ${personaKey}...`);
  const cacheName = createGeminiCache_(soulText, personaKey);
  
  // 保存 (期限は作成から24時間とする)
  const expireAt = new Date().getTime() + (24 * 60 * 60 * 1000);
  props.setProperties({
    ["LAST_DNA_HASH_" + personaKey]: dnaHash,
    ["CACHE_NAME_" + personaKey]: cacheName,
    ["CACHE_EXPIRE_" + personaKey]: expireAt.toString()
  });

  return cacheName;
}

/**
 * DNA文字列からハッシュ（指紋）を作成する
 */
function getDNAHash_(text) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text, Utilities.Charset.UTF_8);
  let hash = '';
  for (let i = 0; i < digest.length; i++) {
    let byte = digest[i];
    if (byte < 0) byte += 256;
    let hex = byte.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    hash += hex;
  }
  return hash;
}

/**
 * 実際に Google API を叩いてキャッシュを作成する
 */
function createGeminiCache_(soulText, personaKey) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("APIキーが設定されていません。");

  const url = `${GEMINI_API_ENDPOINT}/cachedContents?key=${apiKey}`;
  
  const payload = {
    model: DEFAULT_MODEL,
    displayName: `DNA-SOUL-${personaKey}-${new Date().getTime()}`,
    systemInstruction: {
      parts: [{ text: soulText }]
    },
    ttl: CACHE_TTL_SECONDS
  };

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const resText = response.getContentText();
  const code = response.getResponseCode();

  if (code !== 200) {
    throw new Error(`キャッシュ作成エラー(${code}): ${resText}`);
  }

  const json = JSON.parse(resText);
  return json.name; // "cachedContents/xxxxxxxx"
}

/**
 * キャッシュの状態を強制リセット（デバッグ用）
 */
function clearCacheManagerInfo() {
  const props = PropertiesService.getScriptProperties();
  const keys = props.getKeys().filter(k => k.includes("CACHE_") || k.includes("DNA_HASH_"));
  keys.forEach(k => props.deleteProperty(k));
  console.log("[CacheManager] All cache info cleared from PropertiesService.");
}
