import requests

url = "https://jogar.lotarianacional.co.ao/pt/help/838511/resultados"
# Adicionamos um 'User-Agent' para o site pensar que é um navegador comum
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

response = requests.get(url, headers=headers)

# Salva o código fonte em um arquivo TXT para você analisar com calma
with open("codigo_fonte.txt", "w", encoding="utf-8") as f:
    f.write(response.text)

print("Conteúdo salvo em codigo_fonte.txt com sucesso!")