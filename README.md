# 🐝 Néctar · Autorização de saída

Site da coordenação da ECIT.MME: ao aproximar a tag RFID do aluno, imprime a autorização de saída na impressora térmica (38 mm) e avisa o responsável no app/painel dos pais.

**Site:** https://theoecit-hue.github.io/nectar-autorizacao/

O site conversa com o **programa da impressora**, que precisa estar aberto no computador onde estão o leitor (Arduino + RC522) e a impressora térmica USB:

1. Baixe [`programa/Nectar-Impressao.zip`](programa/Nectar-Impressao.zip) e extraia.
2. Instale o [Python](https://www.python.org/downloads/) (marque "Add python.exe to PATH").
3. Dê dois cliques em **Iniciar Néctar Impressão.bat** e deixe a janela aberta.
4. Abra o link do site. Se o navegador pedir acesso a dispositivos da rede local, clique em **Permitir**.
