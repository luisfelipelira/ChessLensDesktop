const attachedTabs = new Set();
chrome.debugger.onDetach.addListener(source => { if (source.tabId) attachedTabs.delete(source.tabId); });
chrome.tabs.onRemoved.addListener(tabId => attachedTabs.delete(tabId));
function attachOnce(tabId) { if (attachedTabs.has(tabId)) return Promise.resolve(); return new Promise((resolve,reject)=>chrome.debugger.attach({tabId},'1.3',()=>{if(chrome.runtime.lastError)return reject(Error(chrome.runtime.lastError.message));attachedTabs.add(tabId);resolve()})); }
function detachTab(tabId) { if (!attachedTabs.has(tabId)) return; chrome.debugger.detach({tabId},()=>attachedTabs.delete(tabId)); }

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type?.startsWith('chesslens-')) return;
  if (message.type === 'chesslens-game-ended') { if (_sender.tab?.id) detachTab(_sender.tab.id); sendResponse({ok:true}); return; }
  if (message.type === 'chesslens-click-move') {
    const tabId = _sender.tab?.id;
    if (!tabId) { sendResponse({ok:false,error:'Aba não encontrada'}); return; }
    const target = {tabId};
    const send = (method,params) => new Promise((resolve,reject)=>chrome.debugger.sendCommand(target,method,params,()=>chrome.runtime.lastError?reject(Error(chrome.runtime.lastError.message)):resolve()));
    (async()=>{try{
      await attachOnce(tabId);
      for (const point of [message.from,message.to]) {
        await send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
        await new Promise(r=>setTimeout(r,140));
      }
      sendResponse({ok:true});
    }catch(error){attachedTabs.delete(tabId);sendResponse({ok:false,error:error.message})}})();
    return true;
  }
  const position = message.type === 'chesslens-position', proposal = message.type === 'chesslens-proposal';
  fetch('http://127.0.0.1:43119/' + (position ? 'position' : proposal ? 'proposal' : 'command'), position || proposal ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message.payload)
  } : { method: 'GET' })
    .then(async response => sendResponse({ ok: response.ok, data: await response.json().catch(() => null) }))
    .catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});
