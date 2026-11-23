# Dashboard Grupo HGI — agenda, almoxarifado, romaneio e financeiro

Site estático do Grupo HGI. A agenda de entregas continua no `index.html`. Os módulos novos ficam ao lado: almoxarifado, romaneio, financeiro dos kits, painel executivo e equipe.

Nada aqui é publicado sozinho. Quem publica é o dono do projeto, depois do `firebase login` na própria máquina. Este repositório não tem senha, token nem chave secreta.

## Antes de publicar as regras

As regras novas fecham o banco. Hoje a agenda está aberta (`entregas` e `lembretes` com leitura e escrita livres). Depois do `firebase deploy --only database`, só entra quem tiver conta e papel. Crie o primeiro administrador **antes** de pedir para o time entrar. O console do Firebase grava esse primeiro papel mesmo com as regras novas, porque o console não passa por elas.

## O que cada pessoa vê

Papel `total` (acesso total, o mesmo da diretoria):

- Márcio
- Zé (José) — é quem normalmente lança valor do kit, quantidade e entrega; o registro mostra **lançado por** com o nome do usuário
- Vitor
- Jaqueline
- Heitor

Esse papel lê e grava agenda, almoxarifado, romaneio, financeiro, painel e a tela Equipe.

Papel `almoxarife`:

- lê e grava o almoxarifado
- vê a fila do romaneio (o que está pronto e o que ainda precisa de romaneio) e gera o número
- **não** lê empreendimentos, produção, valores nem a agenda

Isso está nas regras em `database.rules.json`, no caminho `/usuarios/{uid}/papel`. Esconder o menu não é a trava: o banco recusa a leitura.

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

No console: **Authentication** → **Sign-in method** → **E-mail/senha** → Ativar.

`localhost` já entra como domínio autorizado. Quando o site estiver no ar, o domínio `hgi-agenda-entregas-ab559.web.app` (ou o domínio próprio) também precisa estar em **Authentication → Settings → Authorized domains**. O domínio padrão do Hosting entra sozinho.

## 4. Criar as contas

Ainda em **Authentication → Users → Add user**, crie uma conta por pessoa, com o e-mail que ela vai usar. A senha fica só no console e com a pessoa. Não anote senha neste repositório.

Crie pelo menos:

- Márcio
- Zé (José)
- Vitor
- Jaqueline
- Heitor
- uma conta para o almoxarife (pode ser mais de uma, se houver mais de um almoxarife)

Abra cada usuário e copie o **User UID**.

## 5. Criar o primeiro administrador

Este passo é o que destrava o sistema. Enquanto `/usuarios` estiver vazio, ninguém tem papel e a tela diz isso.

1. No console, abra **Realtime Database**.
2. No caminho `usuarios`, crie um filho com a chave igual ao UID do Márcio (ou de quem for o primeiro acesso total).
3. Dentro dele, grave exatamente estes campos (troque o UID e o e-mail):

```json
{
  "uid": "COLE_O_UID_AQUI",
  "nome": "Márcio",
  "email": "email-que-ele-usa-para-entrar",
  "papel": "total"
}
```

O nome é o que aparece em **lançado por**. Para o Zé, use o nome `Zé` (ou `José`). Papel do almoxarife: `"almoxarife"`. Qualquer outro texto é recusado.

Pode repetir o mesmo bloco para os outros UIDs agora, ou deixar para a tela Equipe depois que o primeiro `total` entrar.

## 6. Publicar as regras

Na pasta do projeto, já com `firebase login` feito:

```bash
firebase deploy --only database --project hgi-agenda-entregas-ab559
```

Confira no console se `database.rules.json` subiu. A partir daí:

- sem login, o banco não responde
- almoxarife não lê `empreendimentos` nem `producao`
- o número do romaneio só anda para a frente

## 7. Publicar o site

```bash
firebase deploy --only hosting --project hgi-agenda-entregas-ab559
```

O endereço fica em `https://hgi-agenda-entregas-ab559.web.app` (o CLI mostra o link no final).

Para olhar no computador antes de publicar:

```bash
python3 -m http.server 8765
```

Abra `http://localhost:8765`. O login só funciona se a `apiKey` já estiver no arquivo e o domínio estiver autorizado.

## 8. Atribuir o restante na tela Equipe

Entre com a conta que já tem papel `total`. Abra **Equipe**. Para cada pessoa:

1. Cole o UID.
2. Escreva o nome.
3. Escreva o e-mail da conta.
4. Escolha **Acesso total** ou **Almoxarife**.
5. Salve.

Quem entra sem papel vê a orientação para pedir o cadastro. Não há como a própria pessoa gravar o papel.

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
