# Configuracao do Firebase - KOLMENA

Este projeto usa Firebase Auth e Cloud Firestore. O Realtime Database nao e mais necessario para o app web.

## Variaveis de ambiente

Copie `.env.example` para `.env` e preencha os valores do app web criado no Firebase:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

## Estrutura no Firestore

Colecoes principais:

```txt
usuarios/{uid}
  nome
  email
  colmeias: ["MEL-001"]
  settings
    showSobreninho
  criadoEm

colmeias/{hiveId}
  apelido
  usuarioId
  controls
    agua
    racao
  lastFeedingTime
    food
    water
  ultimaLeitura
    TempN
    tempSN
    umidN
    umidSN
    lum
    ruido
    timestamp
  leituras: []
  eventos: []
  lastCleaning
  atualizadoEm
```

Os graficos do dashboard usam `colmeias/{hiveId}.leituras`. A leitura mais recente exibida nos cards vem de `ultimaLeitura`.

## Regras de seguranca

As regras estao versionadas em `firestore.rules`. Publicar a app na Vercel nao publica regras do Firestore; depois de alterar regras, publique pelo Console do Firebase ou Firebase CLI.

No Console do Firebase, abra Firestore Database > Rules e publique:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isUser(userId) {
      return signedIn() && request.auth.uid == userId;
    }

    match /usuarios/{userId} {
      allow create: if isUser(userId);
      allow get, update, delete: if isUser(userId);
      allow list: if false;
    }

    match /colmeias/{hiveId} {
      allow create: if signedIn()
        && request.resource.data.usuarioId == request.auth.uid;

      allow get, delete: if signedIn()
        && resource.data.usuarioId == request.auth.uid;

      allow list: if signedIn()
        && resource.data.usuarioId == request.auth.uid;

      allow update: if signedIn()
        && resource.data.usuarioId == request.auth.uid
        && request.resource.data.usuarioId == request.auth.uid;
    }
  }
}
```

Essas regras impedem que um usuario veja, edite ou remova colmeias de outra conta. O cadastro da colmeia nao faz leitura previa do documento; ele cria `colmeias/{hiveId}` diretamente e depende da regra `allow create`.

Para publicar via CLI:

```sh
firebase deploy --only firestore:rules
```

## Fluxo do app

- Ao criar conta ou entrar com Google/e-mail, o app cria/atualiza `usuarios/{uid}`.
- Ao cadastrar uma colmeia, o app cria `colmeias/{hiveId}` com `usuarioId` igual ao usuario autenticado.
- A lista do dashboard consulta somente `colmeias` onde `usuarioId == uid`.
- Os comandos de agua/racao atualizam `controls`, `lastFeedingTime`, `eventos` e `atualizadoEm`.
- Os graficos nao usam valores simulados; eles leem o historico salvo em `leituras`.

## Integracao com hardware

O hardware deve refletir a mesma estrutura do Firestore:

- Ler comandos em `colmeias/{hiveId}.controls.agua` e `colmeias/{hiveId}.controls.racao`.
- Enviar a medicao atual para `colmeias/{hiveId}.ultimaLeitura`.
- Acrescentar historico em `colmeias/{hiveId}.leituras` para alimentar os graficos.

Use `Timestamp` real do Firestore quando possivel; strings ISO 8601 funcionam no app como fallback.
