# Dashboard Grupo HGI — agenda, almoxarifado, romaneio e financeiro

Site estático do Grupo HGI. A agenda de entregas continua no `index.html`. Os módulos novos ficam ao lado: almoxarifado, romaneio, financeiro dos kits, painel executivo e equipe.

Nada aqui é publicado sozinho. Quem publica é o dono do projeto, depois do `firebase login` na própria máquina. Este repositório não tem senha, token nem chave secreta.

## Antes de publicar as regras

As regras novas fecham o banco. Hoje a agenda está aberta (`entregas` e `lembretes` com leitura e escrita livres). Depois do `firebase deploy --only database`, só entra quem tiver conta e papel. Crie o primeiro administrador **antes** de pedir para o time entrar. O console do Firebase grava esse primeiro papel mesmo com as regras novas, porque o console não passa por elas.

## O que cada setor vê

O login é o nome do setor mais a senha. Por baixo, o setor vira a conta `setor@setor.grupohgi.com.br` (minúsculas, sem acento e sem espaço). O papel continua em `/usuarios/{uid}/papel`.

Setor `diretoria`, papel `total`. É a conta usada por Márcio, Zé (José), Vitor, Jaqueline e Heitor. Lê e grava agenda, almoxarifado, romaneio, financeiro, painel e a tela Equipe. Zé é quem normalmente lança valor, quantidade e entrega. O registro mostra **lançado por:** o setor, por exemplo `lançado por: diretoria`.

Setor `almoxarifado`, papel `almoxarifado` no login e `almoxarife` no banco:

- lê e grava o almoxarifado
- vê a fila do romaneio (o que está pronto e o que ainda precisa de romaneio) e gera o número
- **não** lê empreendimentos, produção, valores nem a agenda

Isso está nas regras em `database.rules.json`. Esconder o menu não é a trava: o banco recusa a leitura.

Só quem já tem papel `total` altera papéis pela tela Equipe. Ninguém se promove sozinho.

## 1. Instalar o Firebase CLI

Na máquina do dono:

```bash
npm install -g firebase-tools
firebase login
```

O login abre o navegador. Não rode isso em ambiente compartilhado e não cole o token em lugar nenhum do repositório.

O projeto já está em `.firebaserc`: `hgi-agenda-entregas-ab559`.

## 2. Colar a configuração pública do app web

Abra o [console Firebase](https://console.firebase.google.com/) do projeto **hgi-agenda-entregas-ab559**.

1. Configurações do projeto (engrenagem) → **Seus aplicativos**.
2. Se não houver aplicativo Web, clique em adicionar aplicativo Web. O nome pode ser `Grupo HGI`.
3. Copie `apiKey` e `appId`.
4. Cole os dois em `js/firebase-config.js`.

`databaseURL`, `authDomain` e `projectId` já estão preenchidos. A `apiKey` do Firebase identifica o projeto no navegador; não é senha de administrador. Mesmo assim, use só a chave deste projeto, a que o console mostra no SDK da Web.

## 3. Ligar o login por e-mail e senha

No console: **Authentication** → **Sign-in method** → **E-mail/senha** → Ativar. O setor entra por essa conta. Não há login do Google.

`localhost` já entra como domínio autorizado. Quando o site estiver no ar, o domínio `hgi-agenda-entregas-ab559.web.app` (ou o domínio próprio) também precisa estar em **Authentication → Settings → Authorized domains**. O domínio padrão do Hosting entra sozinho.

## 4. Criar um setor

Cada setor é uma conta só. A senha fica no console e com quem usa o setor. Não anote senha neste repositório.

1. Em **Authentication → Users → Add user**, crie o usuário com o e-mail do setor:
   - diretoria: `diretoria@setor.grupohgi.com.br` — papel `total`. Márcio, Zé, Vitor, Jaqueline e Heitor entram por aqui.
   - almoxarifado: `almoxarifado@setor.grupohgi.com.br` — papel `almoxarife`.
2. O nome do setor na tela vira esse e-mail: minúsculas, sem acento e sem espaço. `Diretoria` e `diretoria` são a mesma conta.
3. Abra o usuário e copie o **User UID**.
4. No **Realtime Database**, crie `usuarios/{uid}`:

```json
{
  "uid": "COLE_O_UID_AQUI",
  "nome": "diretoria",
  "email": "diretoria@setor.grupohgi.com.br",
  "papel": "total"
}
```

Para o almoxarifado, use `"nome": "almoxarifado"`, o e-mail correspondente e `"papel": "almoxarife"`.

Para um setor novo, repita: crie o usuário no Authentication com `<setor>@setor.grupohgi.com.br`, copie o UID e grave o papel. A diretoria também pode fazer o passo do papel na tela Equipe, depois que a conta já existir.

## 5. Primeiro administrador

Enquanto `/usuarios` estiver vazio, o setor entra e a tela diz que ainda não foi liberado. O console grava o primeiro papel mesmo com as regras novas.

1. Crie a conta `diretoria@setor.grupohgi.com.br`.
2. Copie o UID.
3. Grave `usuarios/{uid}` com `"papel": "total"`, como no bloco acima.

Aí a diretoria entra com o setor `diretoria` e a senha definida no console.

## 6. Publicar o site e, em seguida, as regras

Publique os dois juntos, com o site primeiro. Se as regras fecharem o banco enquanto o Hosting ainda serve a agenda antiga, essa versão não envia login e a agenda para de abrir até o site novo entrar ou as regras serem desfeitas.

Na pasta do projeto, já com `firebase login` feito:

```bash
firebase deploy --only hosting,database --project hgi-agenda-entregas-ab559
```

Se precisar separar:

```bash
firebase deploy --only hosting --project hgi-agenda-entregas-ab559
firebase deploy --only database --project hgi-agenda-entregas-ab559
```

Se o Hosting falhar depois das regras, publique o Hosting de novo. Se isso não for possível na hora, no console do Realtime Database use a aba Regras e restaure a versão anterior (o histórico fica nessa aba) para a agenda antiga voltar a responder. Isso reabre o banco até o site novo estar no ar. Não apaga os dados.

Com as regras novas:

- sem login, o banco não responde
- almoxarife não lê `empreendimentos` nem `producao`
- o número do romaneio só anda para a frente, e a obra só recebe um

## 7. Endereço do site

O comando de Hosting mostra o link no final. O padrão é `https://hgi-agenda-entregas-ab559.web.app`.

Para olhar no computador antes de publicar:

```bash
python3 -m http.server 8765
```

Abra `http://localhost:8765`. O login só funciona se a `apiKey` já estiver no arquivo e o domínio estiver autorizado.

## 8. Liberar outro setor na tela Equipe

Entre com o setor `diretoria`. Abra **Equipe**. A conta do setor já precisa existir no Authentication.

1. Cole o UID.
2. Escreva o setor (por exemplo `almoxarifado`).
3. Escreva o e-mail `almoxarifado@setor.grupohgi.com.br`.
4. Escolha **Acesso total** (`total`) ou **Almoxarife** (`almoxarife`).
5. Salve.

Quem entra sem papel vê o pedido para falar com o Márcio. O setor não grava o próprio papel.

## Como os módulos funcionam

**Almoxarifado.** Colunas iguais à planilha: Código, Item, Categoria, Unidade, Estoque mínimo, Entrada, Saída, Saldo, Status, Observação. As nove linhas iniciais (mangueira, fio, disjuntor, ilhós, parafuso e as outras) são exemplo de nome. Código e quantidades começam em branco. Saldo = Entrada − Saída, calculado na tela, não gravado. Status **Repor** quando o saldo é menor que o estoque mínimo; **OK** quando já há saldo e o mínimo passa, ou quando o mínimo ainda está em branco. Sem entrada e sem saída, saldo e status ficam em branco.

**Romaneio.** O número tem o ano em dois dígitos e mais quatro dígitos: `260001`, `260002`, até `269999`. Em 2026 o primeiro é 260001. A reserva usa transação do Realtime Database em `contadores/romaneio`, então dois cliques ao mesmo tempo não pegam o mesmo número. Ao cadastrar a obra no Financeiro, a fila do almoxarife ganha o nome e a quantidade, sem preço. Três grupos: ainda não está pronto, pronto e falta romaneio, romaneio já gerado. O cartão mostra **lançado por**.

**Financeiro.** Uma linha por obra: valor do kit elétrico, valor do kit QDC, quantidade contratada, quantidade entregue, saldo (contratada − entregue), quantidade e valor projetados da semana, quantidade e valor reais da semana. Valor = quantidade × (kit elétrico + kit QDC). Deixe o preço em branco quando aquele kit não existe. Sem lançamento, a célula fica "—". Nada da foto de 23/11/2026 foi copiado para o banco.

**Painel.** Cartões de projetado e real, nos dois níveis (R$ e quantidade), gráfico por obra e a semana corrente com a faixa laranja. A produção da semana também aparece dia a dia, em R$ e em quantidade.

**Acumulado do mês.** O botão abre o modal com o mês até hoje: produzido, romaneios lançados e projeção acumulada até cada dia, de novo em R$ e em quantidade, mais o recorte por obra.

## Exemplo visual

`almoxarifado.html?exemplo=1`, `romaneio.html?exemplo=1`, `financeiro.html?exemplo=1` e `painel.html?exemplo=1` mostram o formato com a faixa **Exemplo visual**. Esses números não vão para o Firebase. O almoxarifado de exemplo continua com quantidade em branco. `painel.html?exemplo=1&modal=1` abre o acumulado do mês.

## Teste local das contas

```bash
node test/calculos.test.js
```

Esse teste cobre saldo, status Repor, o número do romaneio (sem repetir e dentro da mesma regra do contador) e os totais do exemplo visual.

## Se algo falhar

- **apiKey** vazia ou recusada: volte ao passo 2.
- Entrou, mas "ainda não tem papel": falta o nó `usuarios/{uid}` do passo 5.
- **permission_denied** no financeiro com usuário almoxarife: é o esperado.
- Romaneio não numera: publique as regras e confira se o papel é `total` ou `almoxarife`.
- A agenda antiga parou para quem não tem conta: também é o esperado, depois das regras.
