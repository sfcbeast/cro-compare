FROM alpine:3.20
ARG PB_VERSION=0.39.10
RUN apk add --no-cache ca-certificates unzip wget
RUN wget -q https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip -O /tmp/pb.zip \
 && unzip /tmp/pb.zip -d /pb && rm /tmp/pb.zip
COPY pb/pb_public /pb/pb_public
COPY pb/pb_migrations /pb/pb_migrations
EXPOSE 8090
# /pb/pb_data must be a persistent volume
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data"]
