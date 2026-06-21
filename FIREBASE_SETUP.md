# 🔧 Configuração do Firebase - KOLMENA

## ❌ Erro Atual
```
FIREBASE WARNING: set at /hives/MEL-001/controls/water failed: permission_denied
Erro ao atualizar controle: Error: PERMISSION_DENIED: Permission denied
```

## ✅ Solução: Atualizar Regras de Segurança do Firebase Realtime Database

### Passo 1: Acessar o Console do Firebase
1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto **kolmena-1b3be**

### Passo 2: Navegar até Realtime Database
1. No menu lateral esquerdo, clique em **"Realtime Database"**
2. Clique na aba **"Regras"** (Rules)

### Passo 3: Substituir as Regras
Copie e cole o seguinte código de regras:

```json
{
  "rules": {
    "hives": {
      "$hiveId": {
        ".read": true,
        ".write": true,
        "controls": {
          ".read": true,
          ".write": true
        },
        "lastFeedingTime": {
          ".read": true,
          ".write": true
        },
        "metrics": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

### Passo 4: Publicar as Regras
1. Clique no botão **"Publicar"** (Publish)
2. Aguarde a confirmação de que as regras foram aplicadas

### Passo 5: Testar
1. Volte para o dashboard do KOLMENA
2. Atualize a página (F5)
3. Tente acionar os botões de água ou alimentação
4. Os botões devem funcionar sem erros

---

## 📊 Estrutura de Dados no Firebase

Após aplicar as regras, o Firebase terá a seguinte estrutura:

```
kolmena-1b3be-default-rtdb/
└── hives/
    └── MEL-001/
        ├── controls/
        │   ├── water: true/false
        │   └── food: true/false
        ├── lastFeedingTime/
        │   ├── water: 1710795094515 (timestamp)
        │   └── food: 1710795094515 (timestamp)
        └── metrics/ (opcional)
            ├── temperature: 34.5
            ├── humidity: 62
            ├── noise: 45
            └── luminosity: 880
```

---

## ⚠️ Importante para Produção

**ATENÇÃO:** As regras acima permitem leitura e escrita pública para facilitar o desenvolvimento.

Para um ambiente de produção, você deve adicionar autenticação:

```json
{
  "rules": {
    "hives": {
      "$hiveId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "controls": {
          ".read": "auth != null",
          ".write": "auth != null"
        },
        "lastFeedingTime": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      }
    }
  }
}
```

Isso garante que apenas usuários autenticados possam ler e escrever dados.

---

## 🔗 Integração com ESP32

A ESP32 deve monitorar os seguintes caminhos no Firebase:

### Para receber comandos:
```cpp
// Firebase path para controles
Firebase.getBool(firebaseData, "/hives/MEL-001/controls/water");
Firebase.getBool(firebaseData, "/hives/MEL-001/controls/food");
```

### Para enviar métricas (opcional):
```cpp
// Firebase path para métricas
Firebase.setFloat(firebaseData, "/hives/MEL-001/metrics/temperature", temperature);
Firebase.setFloat(firebaseData, "/hives/MEL-001/metrics/humidity", humidity);
```

---

## 🆘 Problemas Comuns

### Erro persiste após atualizar regras?
1. Faça logout completo do dashboard
2. Limpe o cache do navegador (Ctrl+Shift+Del)
3. Faça login novamente

### Dados não aparecem no Firebase?
1. Verifique se o projeto está correto: **kolmena-1b3be**
2. Verifique a URL do database: `https://kolmena-1b3be-default-rtdb.firebaseio.com`
3. Certifique-se de que as regras foram publicadas

---

## 📝 Notas

- As regras do Firebase são aplicadas em **tempo real**
- Não é necessário reiniciar o servidor ou aplicação
- Você pode ver os dados sendo salvos na aba "Dados" do Realtime Database
