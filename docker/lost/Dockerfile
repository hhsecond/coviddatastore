ARG base_image=l3pcv/lost:1.0.0
FROM $base_image
# Add Code  
ADD /docker/lost/entrypoint.sh /
ADD /docker/lost/pytest.sh /
ADD /docker/lost/nginx/ /code/docker/lost/nginx
ADD /backend/ /code/backend
ADD /frontend/ /code/frontend
ADD /docs/ /code/docs
RUN echo "export PATH=$PATH:/code/backend/lost/cli" >> ~/.bashrc
RUN echo "conda activate lost" >> ~/.bashrc