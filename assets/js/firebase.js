// SchoolFlow — inicialização do Firebase
// ---------------------------------------------------------------------------
// O config web do Firebase não é um segredo: as permissões reais ficam nas
// regras do Firestore. Nunca coloque aqui chaves de conta de serviço.

const SF_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD9XbadRjWRAUo8jtGn9rOSZDhOx92Y6TE',
  authDomain: 'proj-schoolflow.firebaseapp.com',
  projectId: 'proj-schoolflow',
  storageBucket: 'proj-schoolflow.firebasestorage.app',
  messagingSenderId: '893165942536',
  appId: '1:893165942536:web:622428aa94b7747f0edebd',
  measurementId: 'G-8ZLXGRP478'
};

const SF_FIREBASE = (() => {
  if (typeof firebase === 'undefined' || !firebase.initializeApp) {
    console.warn('Firebase SDK não carregado. O SchoolFlow usará o modo local.');
    return { available: false, config: SF_FIREBASE_CONFIG };
  }

  try {
    const app = firebase.apps?.length ? firebase.app() : firebase.initializeApp(SF_FIREBASE_CONFIG);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const FieldValue = firebase.firestore.FieldValue;
    const FieldPath = firebase.firestore.FieldPath;

    // Cache offline opcional: mantém leituras recentes se a rede oscilar.
    db.enablePersistence({ synchronizeTabs: true }).catch((error) => {
      if (error?.code !== 'failed-precondition' && error?.code !== 'unimplemented') {
        console.warn('Cache offline do Firestore indisponível.', error);
      }
    });

    return {
      available: true,
      app,
      auth,
      db,
      FieldValue,
      FieldPath,
      config: SF_FIREBASE_CONFIG,
      waitForAuthUser() {
        return new Promise((resolve) => {
          let unsubscribe = null;
          let settled = false;
          const finish = (user) => {
            if (settled) return;
            settled = true;
            if (typeof unsubscribe === 'function') unsubscribe();
            resolve(user);
          };
          unsubscribe = auth.onAuthStateChanged(finish);
        });
      }
    };
  } catch (error) {
    console.error('Falha ao inicializar o Firebase.', error);
    return { available: false, config: SF_FIREBASE_CONFIG, error };
  }
})();

window.SF_FIREBASE = SF_FIREBASE;

function sfFirebaseErrorMessage(error) {
  const code = String(error?.code || '').replace('auth/', '');
  const messages = {
    'invalid-email': 'Email inválido. Confira o endereço digitado.',
    'user-disabled': 'Esta conta foi desativada. Fale com a administração.',
    'user-not-found': 'Não encontramos uma conta com esse email.',
    'wrong-password': 'Senha incorreta. Confira e tente novamente.',
    'invalid-credential': 'Email ou senha incorretos.',
    'invalid-login-credentials': 'Email ou senha incorretos.',
    'email-already-in-use': 'Já existe uma conta com esse email.',
    'weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'operation-not-allowed': 'Este método de login não está habilitado no Firebase.',
    'too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    'network-request-failed': 'Sem conexão com o Firebase. Verifique sua internet.',
    'admin-restricted-operation': 'Login anônimo desativado no Firebase.',
    'unauthorized-domain': 'Este domínio não está autorizado no Firebase Authentication.',
    'permission-denied': 'Sem permissão para acessar o banco. Confira as regras do Firestore.',
    'unavailable': 'Firestore indisponível no momento. Tente novamente.',
    'failed-precondition': 'O Firestore precisa de um índice ou configuração adicional.',
    'not-found': 'Registro não encontrado no banco.'
  };
  if (messages[code]) return messages[code];
  if (String(error?.code || '').startsWith('auth/')) {
    return 'Não foi possível autenticar. Confira os dados e tente novamente.';
  }
  return error?.message || 'Não foi possível concluir a operação no Firebase.';
}

function sfFirebaseAuthError(error) {
  const code = String(error?.code || '').replace('auth/', '');
  return sfFirebaseErrorMessage({ code });
}
