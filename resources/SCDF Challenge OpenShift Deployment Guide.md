# SCDF Lifesavers' Innovation Challenge 2026: OpenShift Deployment Guide

## Introduction

Image credit: [Pexels trading application photo](https://www.pexels.com/photo/crop-dealer-touching-screen-on-smartphone-with-trading-application-6347705/)

Dear Finalists,

Congratulations on making it this far.

Before you present your amazing prototypes to the judges on the final day, your next challenge is to deploy your application. Welcome to this guide on deploying your application to OpenShift.

To fully grasp the deployment process, start with a scenario where you need to perform a deployment.

Imagine you have been hired by Finiva Inc., a leading fintech company, to deploy its web application to make it accessible for everyone. The application's source code resides in a GitLab repository provided by the company.

Your task is simple: clone the code repository, build the application into a Docker image, and push the container image to Harbor, which is an image registry.

Finally, run your image as a container on OpenShift, a Kubernetes platform designed to host your containerised applications.

## Tasks

At the end of this assessment, you will be able to perform the following tasks:

1. Log in to the OpenShift Console.
2. Clone the repository.
3. Log in to Harbor.
4. Containerise the application and push the image to Harbor.
5. Deploy the application on OpenShift.

## Prerequisites

Before starting this guide, ensure you have the following tools installed on your machine:

1. Docker Desktop
   - Windows: <https://docs.docker.com/desktop/install/windows-install/>
   - Mac: <https://docs.docker.com/desktop/install/mac-install/>
2. Git: <https://git-scm.com/downloads>
3. Optional: Linux-based commands are mainly used for all examples in this assessment. Windows users can use Command Prompt to run similar Docker CLI and Git operations.
   - For the best experience, consider installing one of these Linux-based environments for Windows:
   - Cygwin: <https://www.cygwin.com/install.html>
   - WSL: <https://learn.microsoft.com/en-us/windows/wsl/install>

## Deployment Guide

## Login to OpenShift Console

Image credits: [OpenShift logo](https://en.m.wikipedia.org/wiki/File:OpenShift-LogoType.svg), [Kubernetes logo](https://1000logos.net/kubernetes-logo/)

Introducing OpenShift, a Kubernetes-based container platform that allows developers to build, deploy, and manage containerised applications. It is developed by Red Hat and builds on Kubernetes to provide additional features that make it suitable for enterprise environments.

Image credit: [OpenShift meme](https://www.linkedin.com/posts/benoitentzmann_devops-kubernetes-openshift-activity-7148597442135949313-2IWj/)

OpenShift also comes with a user-friendly and intuitive console, so new users do not have to worry if they are not comfortable managing Kubernetes using command-line tools.

1. To access the OpenShift console, visit <https://console-openshift-console.apps.innovate.sg-aie.com/>.
2. Click **keycloak** as your sign-in method.
3. Sign in using the login credentials you registered during platform onboarding.

### Password Reset Note

- If you forgot your password, click **Forgot Password?** to reset it.
- If resetting your password fails, contact your respective mentor.

4. After signing in, you will be brought into the OpenShift console. Inside the console, you will find your team's name, which has already been created for you.
5. Optional: If you see a pop-up window asking for a tour, you can either click **Skip tour** or **Get started** to get familiarised with the console.

### Team Name Note

- If you do not see your team name, contact your respective mentor.

## Clone the Repository

The developers from Finiva Inc. build and store the application source code in this GitLab repository:

<https://gitlab.com/cnateamx/finiva-app.git>

Your next task is to clone the repository onto your machine.

1. Open your terminal and download the Finiva web application.

```bash
git clone https://gitlab.com/cnateamx/finiva-app.git
```

2. View the application's project structure.

```bash
cd finiva-app
ls
```

For Windows Command Prompt:

```cmd
dir
```

Regardless of your operating system, you should have a copy of the application's source code on your machine consisting of 3 documents:

1. `app` folder
2. `requirements.txt`
3. `Dockerfile`

## Login to Harbor

Your next task is to build the application into an image and store it in an image registry. Before you proceed further, take a moment to understand what images and registries are.

Image credit: [Container image security](https://k21academy.com/docker-kubernetes/kubernetes-security/container-image-security/)

Do not mistake an image for a `.jpg` or `.png` file. Imagine an image as a package that contains everything your software needs to run: your code, dependencies, libraries, and configuration files bundled together. It serves as a blueprint for creating a container that runs your application.

Once this image is built, it is stored in an image registry where it can be downloaded and used by anyone. When deploying your app on a Kubernetes platform like OpenShift, the platform pulls the image from your registry and runs it as a container, making your application accessible to your end users.

Image credit: [Docker images, layers, and registry](https://www.practical-devsecops.com/lesson-2-docker-images-docker-layers-and-registry/)

In simple terms, an image registry is a place to store and share your images, similar to how GitHub stores and shares code.

Introducing Harbor, an open-source image registry similar to Docker Hub, with enhanced security features and identity integration for securely distributing images.

Before you build your image, obtain the credentials to your Harbor registry.

1. Access the Harbor console: <https://ihl-harbor.apps.innovate.sg-aie.com/>.
2. Click **LOGIN WITH keycloak**.
3. Enter the same credentials as your OpenShift console.
4. Once logged in, you will see your assigned project. The project is named after your team's name. This project is where you will store your images.
5. Find your account's CLI secret. This secret is essential for uploading your image into your registry.
6. Click **User Profile** at the top right corner of the page.
7. Copy the CLI secret.
8. Launch Docker Desktop.
9. In your terminal, log in to the Harbor repository with your Keycloak username.

```bash
docker login https://ihl-harbor.apps.innovate.sg-aie.com/
```

10. When prompted, enter your Harbor username. For the password, paste the CLI secret copied earlier.

### Harbor Notes

- If you do not see your project, contact your respective mentor.
- Do not worry if nothing appears after pasting your CLI secret. Your terminal is hiding the input for security. Once you have pasted it, press Enter to continue.

## Containerise Application and Push Image to Harbor

Once logged in to your Harbor registry, build your application into a Docker image and upload it to the registry.

1. From your terminal, navigate to the `finiva-app` directory.

```bash
cd finiva-app
```

2. Build your application into an image.

```bash
docker build -t ihl-harbor.apps.innovate.sg-aie.com/<your-team-name>/finiva .
```

The `-t` flag tags the image with a name and location. Since you are pushing to Harbor, the tag must follow this format so Docker knows where to upload the image.

Example:

```bash
docker build -t ihl-harbor.apps.innovate.sg-aie.com/fantastic-team/finiva .
```

Do not forget the full stop at the end. This tells Docker to refer to the `Dockerfile` found in your current directory when building the image.

3. Once built, view your built image.

```bash
docker image ls
```

4. Push the image to Harbor.

```bash
docker push ihl-harbor.apps.innovate.sg-aie.com/fantastic-team/finiva
```

5. Log in to Harbor on the browser: <https://ihl-harbor.apps.innovate.sg-aie.com/>.
6. Access your project. You should see that your image has been uploaded successfully to the registry.
7. Click your repository to view more information.
8. You should see your uploaded image with the tag.

## Deploy Application on OpenShift

Your last step is to deploy your containerised application to OpenShift.

1. Log in to the OpenShift console: <https://console-openshift-console.apps.innovate.sg-aie.com/>.
2. Click **+Add**.
3. Click **Container images**.
4. Under **Image name from external registry**, enter the image name in this format:

```text
ihl-harbor.apps.innovate.sg-aie.com/<your-team-name>/<app>
```

Example:

```text
ihl-harbor.apps.innovate.sg-aie.com/fantastic-team/finiva
```

5. Fill up the remaining form and deploy your image by clicking **Create**.

### Form Notes

- Ensure your registry is validated.
- Optional: change the runtime icon to your favourite icon.
- Optional: give your application a unique name.
- Ensure your app listens on port `8080`.

Image credit: [Almost there GIF](https://tenor.com/plE1iC1tHbZ.gif)

6. Once created, OpenShift will download the image from your registry and deploy it as a container on the platform.
7. A successful deployment will appear in the OpenShift topology view.
8. Click your application's logo. A sliding panel will appear.
9. Scroll to **Routes**. Your application's URL will be available there.
10. Click the URL to access your application.

Congratulations. You have successfully deployed a containerised application for Finiva Inc. through OpenShift.

## End of Guide: Hackathon Notes

If you have reached this section, you should have acquired the knowledge and skills needed to deploy your application to the OpenShift console.

Please read the following notes carefully:

- For this hackathon, each team is required to deploy at least one app onto the platform as part of the initiative to foster the development of containerised, scalable, and highly available cloud-native applications.
- This platform does not provide GPUs and is not suitable for hosting Large Language Models. For LLM-based solutions, consider a hybrid architecture or calling cloud-hosted AI APIs.
- Delete the Finiva app or any sample applications created for this lab guide. Otherwise, you might encounter resource quota errors. To delete your applications, refer to the **Delete Applications** section.

## Delete Applications

To remove your deployed applications, you can use the Developer Console and complete the process with a few clicks. However, depending on how the deployments were initially created, some additional steps may be required to ensure everything is properly cleaned up.

## Delete Single Application

1. Log in to your OpenShift console: <https://console-openshift-console.apps.innovate.sg-aie.com/>.
2. Visit **Topology** at the side panel and select your project, which is your team name.
3. To delete your running deployment, click the button for your deployment and select **Delete Deployment**.

## Delete Group of Applications

1. If you previously created multiple applications under the same application name, click the button for the application name, shown as the darker box.
2. Select **Delete application**.

### Delete Group Note

- This deletes all applications belonging to the same application name.

## Common Issues During Deployment

## Resource Quota Error

If your team members are attempting this exercise, you may encounter a resource quotas error.

This error means that your team has hit the maximum resource limit that the platform allows your team's applications to run on.

To resolve this issue:

1. Remove unused applications that will not be used for the finale.
2. For teams that require more compute resources to host all applications, contact your team mentor.
