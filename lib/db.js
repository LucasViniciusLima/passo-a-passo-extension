let connection;
export function openDB() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const req = indexedDB.open('passo-a-passo', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('sessions', {keyPath: 'id'});
      const steps = db.createObjectStore('steps', {keyPath: 'id'});
      steps.createIndex('sessionId', 'sessionId');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { connection = null; reject(req.error); };
  });
  return connection;
}
export async function put(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Não foi possível salvar.'));
  });
}
export async function get(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function listSessions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('sessions').objectStore('sessions').getAll();
    req.onsuccess = () => resolve(req.result.sort((a,b) => b.createdAt-a.createdAt));
    req.onerror = () => reject(req.error);
  });
}
export async function listSteps(sessionId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('steps').objectStore('steps').index('sessionId').getAll(sessionId);
    req.onsuccess = () => resolve(req.result.sort((a,b) => a.order-b.order));
    req.onerror = () => reject(req.error);
  });
}
export async function removeStep(id) {
  const db = await openDB();
  return new Promise((resolve,reject) => {
    const tx=db.transaction('steps','readwrite'); tx.objectStore('steps').delete(id);
    tx.oncomplete=resolve; tx.onerror=tx.onabort=()=>reject(tx.error);
  });
}
export async function reorderSteps(steps) {
  const db = await openDB();
  return new Promise((resolve,reject) => {
    const tx=db.transaction('steps','readwrite');
    steps.forEach((step,i)=>tx.objectStore('steps').put({...step,order:i}));
    tx.oncomplete=resolve; tx.onerror=tx.onabort=()=>reject(tx.error);
  });
}
export async function deleteSession(id) {
  const db=await openDB();
  return new Promise((resolve,reject) => {
    const tx=db.transaction(['sessions','steps'],'readwrite');
    tx.objectStore('sessions').delete(id);
    const req=tx.objectStore('steps').index('sessionId').openCursor(IDBKeyRange.only(id));
    req.onsuccess=()=>{const cursor=req.result;if(cursor){cursor.delete();cursor.continue();}};
    tx.oncomplete=resolve; tx.onerror=tx.onabort=()=>reject(tx.error);
  });
}
