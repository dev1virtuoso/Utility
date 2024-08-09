docker run \
-p 10000:8888 \
-e GRANT_SUDO=yes \
--user root \
quay.io/jupyter/scipy-notebook:2024-03-14
