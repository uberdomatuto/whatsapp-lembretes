FROM atendai/evolution-api:v2.1.1

# Variáveis de ambiente serão configuradas no Render
ENV SERVER_PORT=8080

# Expor porta
EXPOSE 8080

# Comando já está na imagem base
