# SCDF Lifesavers' Innovation Challenge 2026: NVIDIA NIM

## Introduction

For this hackathon, teams are free to use any third-party services or platforms, such as Hugging Face, OpenAI, Claude, and others, as long as they align with your use case and help you build the best possible prototype.

That said, the organisers would also like to share a few recommended resources and tools that may help accelerate your development and enhance your solution.

## NVIDIA Inference Microservices (NIM)

Image credit: [NIM Microservices Image](https://techcrunch.com/wp-content/uploads/2024/03/NIM-Microservices-Image.png)

NVIDIA NIM, or NVIDIA Inference Microservices, is a set of ready-made containers that let you run AI models as APIs with just a few steps. Instead of setting up complex infrastructure, you can quickly deploy powerful generative AI models and use them in your app right away.

## To Use NIM

There are 2 ways to use NIM:

1. API endpoint call
2. Self-host, which requires a GPU in your environment

## Prerequisites

1. Ensure Docker CLI is installed.
2. Sign up as a developer through [Try NVIDIA NIM APIs](https://build.nvidia.com/).
3. Click **Login**, and key in your email.
4. In the **Create Your Account** page, fill in your credentials and click **Create Account**.
5. Once your account is set up and ready, click your profile at the top right and click **API Keys**.
6. Click **Generate API Key**.
7. Enter an API key name and optionally set an expiration.
8. Copy the API key somewhere safe.

## API Endpoint Call

1. Go to the main page or access [Try NVIDIA NIM APIs](https://build.nvidia.com/models).
2. Search for models, tools, or libraries suitable for your use case.
3. On the left panel, filter models that provide a **Free Endpoint**, then click **Apply**.
4. Select your favourite model.
5. In the description page, follow the code snippet to use its free API endpoint.

### Note

- You may encounter rate limits when using the API. For development, use one team member's API key, then switch to another teammate's key for the finale to help reduce throttling.

## Self-Host

1. For teams who wish to self-host the NIM containers, use the left menu to filter **Download Available**, then click **Apply**.
2. Select your favorite model.
3. From the description page, select **Self-Hosted Deployments**.
4. Follow the guide on how to self-host the model.

### Note

- The examples above are for demonstration purposes. Running generative AI models locally requires sufficient GPU resources, and larger models may need more powerful hardware to run smoothly.
- If your team is using a Dell GB10, check the model requirements before deployment. Some AI models may exceed the GB10's available GPU resources. Choose a model that fits your system specifications for the best experience.

## Useful Links

Here are useful links to explore and experiment with different NVIDIA NIM models. You can use your generated API key for them as well.

- [Try NVIDIA NIM APIs](https://build.nvidia.com/)
- [GPU-optimized AI, Machine Learning, & HPC Software | NVIDIA NGC](https://catalog.ngc.nvidia.com/)
