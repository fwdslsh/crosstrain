Enterprise deployment overview - Claude Code Docs

[Skip to main content](#content-area)

[Claude Code Docs home page![light logo](https://mintcdn.com/claude-code/o69F7a6qoW9vboof/logo/light.svg?fit=max&auto=format&n=o69F7a6qoW9vboof&q=85&s=536eade682636e84231afce2577f9509)![dark logo](https://mintcdn.com/claude-code/o69F7a6qoW9vboof/logo/dark.svg?fit=max&auto=format&n=o69F7a6qoW9vboof&q=85&s=0766b3221061e80143e9f300733e640b)](/docs)

![US](https://d3gk2c5xim1je2.cloudfront.net/flags/US.svg)

English

Search...

⌘K

*   [Claude Developer Platform](https://platform.claude.com/)
*   [Claude Code on the Web](https://claude.ai/code)
*   [

    Claude Code on the Web

    ](https://claude.ai/code)

Search...

Navigation

Deployment

Enterprise deployment overview

[Getting started

](/docs/en/overview)[Build with Claude Code

](/docs/en/sub-agents)[Deployment

](/docs/en/third-party-integrations)[Administration

](/docs/en/setup)[Configuration

](/docs/en/settings)[Reference

](/docs/en/cli-reference)[Resources

](/docs/en/legal-and-compliance)

##### Deployment


*   [

    Overview

    ](/docs/en/third-party-integrations)
*   [

    Amazon Bedrock

    ](/docs/en/amazon-bedrock)
*   [

    Google Vertex AI

    ](/docs/en/google-vertex-ai)
*   [

    Microsoft Foundry

    ](/docs/en/microsoft-foundry)
*   [

    Network configuration

    ](/docs/en/network-config)
*   [

    LLM gateway

    ](/docs/en/llm-gateway)
*   [

    Development containers

    ](/docs/en/devcontainer)
*   [

    Sandboxing

    ](/docs/en/sandboxing)

On this page

*   [Provider comparison](#provider-comparison)
*   [Cloud providers](#cloud-providers)
*   [Corporate infrastructure](#corporate-infrastructure)
*   [Configuration overview](#configuration-overview)
*   [Using Bedrock with corporate proxy](#using-bedrock-with-corporate-proxy)
*   [Using Bedrock with LLM Gateway](#using-bedrock-with-llm-gateway)
*   [Using Foundry with corporate proxy](#using-foundry-with-corporate-proxy)
*   [Using Foundry with LLM Gateway](#using-foundry-with-llm-gateway)
*   [Using Vertex AI with corporate proxy](#using-vertex-ai-with-corporate-proxy)
*   [Using Vertex AI with LLM Gateway](#using-vertex-ai-with-llm-gateway)
*   [Authentication configuration](#authentication-configuration)
*   [Choosing the right deployment configuration](#choosing-the-right-deployment-configuration)
*   [Direct provider access](#direct-provider-access)
*   [Corporate proxy](#corporate-proxy)
*   [LLM Gateway](#llm-gateway)
*   [Debugging](#debugging)
*   [Best practices for organizations](#best-practices-for-organizations)
*   [1\. Invest in documentation and memory](#1-invest-in-documentation-and-memory)
*   [2\. Simplify deployment](#2-simplify-deployment)
*   [3\. Start with guided usage](#3-start-with-guided-usage)
*   [4\. Configure security policies](#4-configure-security-policies)
*   [5\. Leverage MCP for integrations](#5-leverage-mcp-for-integrations)
*   [Next steps](#next-steps)

Deployment

# Enterprise deployment overview


Copy page

Learn how Claude Code can integrate with various third-party services and infrastructure to meet enterprise deployment requirements.

Copy page

This page provides an overview of available deployment options and helps you choose the right configuration for your organization.

##

[​


](#provider-comparison)

Provider comparison

Feature

Anthropic

Amazon Bedrock

Google Vertex AI

Microsoft Foundry

Regions

Supported [countries](https://www.anthropic.com/supported-countries)

Multiple AWS [regions](https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html)

Multiple GCP [regions](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations)

Multiple Azure [regions](https://azure.microsoft.com/en-us/explore/global-infrastructure/products-by-region/)

Prompt caching

Enabled by default

Enabled by default

Enabled by default

Enabled by default

Authentication

API key

API key or AWS credentials

GCP credentials

API key or Microsoft Entra ID

Cost tracking

Dashboard

AWS Cost Explorer

GCP Billing

Azure Cost Management

Enterprise features

Teams, usage monitoring

IAM policies, CloudTrail

IAM roles, Cloud Audit Logs

RBAC policies, Azure Monitor

##

[​


](#cloud-providers)

Cloud providers

[

## Amazon Bedrock


Use Claude models through AWS infrastructure with API key or IAM-based authentication and AWS-native monitoring

](/docs/en/amazon-bedrock)[

## Google Vertex AI


Access Claude models via Google Cloud Platform with enterprise-grade security and compliance

](/docs/en/google-vertex-ai)[

## Microsoft Foundry


Access Claude through Azure with API key or Microsoft Entra ID authentication and Azure billing

](/docs/en/microsoft-foundry)

##

[​


](#corporate-infrastructure)

Corporate infrastructure

[

## Enterprise Network


Configure Claude Code to work with your organization’s proxy servers and SSL/TLS requirements

](/docs/en/network-config)[

## LLM Gateway


Deploy centralized model access with usage tracking, budgeting, and audit logging

](/docs/en/llm-gateway)

##

[​


](#configuration-overview)

Configuration overview

Claude Code supports flexible configuration options that allow you to combine different providers and infrastructure:

Understand the difference between:

*   **Corporate proxy**: An HTTP/HTTPS proxy for routing traffic (set via `HTTPS_PROXY` or `HTTP_PROXY`)
*   **LLM Gateway**: A service that handles authentication and provides provider-compatible endpoints (set via `ANTHROPIC_BASE_URL`, `ANTHROPIC_BEDROCK_BASE_URL`, or `ANTHROPIC_VERTEX_BASE_URL`)

Both configurations can be used in tandem.

###

[​


](#using-bedrock-with-corporate-proxy)

Using Bedrock with corporate proxy

Route Bedrock traffic through a corporate HTTP/HTTPS proxy:

Report incorrect code

Copy

Ask AI
```

# Enable Bedrock

export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION=us-east-1

# Configure corporate proxy

export HTTPS_PROXY='https://proxy.example.com:8080'
```

###

[​


](#using-bedrock-with-llm-gateway)

Using Bedrock with LLM Gateway

Use a gateway service that provides Bedrock-compatible endpoints:

Report incorrect code

Copy

Ask AI
```

# Enable Bedrock

export CLAUDE_CODE_USE_BEDROCK=1

# Configure LLM gateway

export ANTHROPIC_BEDROCK_BASE_URL='https://your-llm-gateway.com/bedrock'
export CLAUDE_CODE_SKIP_BEDROCK_AUTH=1  # If gateway handles AWS auth
```

###

[​


](#using-foundry-with-corporate-proxy)

Using Foundry with corporate proxy

Route Azure traffic through a corporate HTTP/HTTPS proxy:

Report incorrect code

Copy

Ask AI
```

# Enable Microsoft Foundry

export CLAUDE_CODE_USE_FOUNDRY=1
export ANTHROPIC_FOUNDRY_RESOURCE=your-resource
export ANTHROPIC_FOUNDRY_API_KEY=your-api-key  # Or omit for Entra ID auth

# Configure corporate proxy

export HTTPS_PROXY='https://proxy.example.com:8080'
```

###

[​


](#using-foundry-with-llm-gateway)

Using Foundry with LLM Gateway

Use a gateway service that provides Azure-compatible endpoints:

Report incorrect code

Copy

Ask AI
```

# Enable Microsoft Foundry

export CLAUDE_CODE_USE_FOUNDRY=1

# Configure LLM gateway

export ANTHROPIC_FOUNDRY_BASE_URL='https://your-llm-gateway.com'
export CLAUDE_CODE_SKIP_FOUNDRY_AUTH=1  # If gateway handles Azure auth
```

###

[​


](#using-vertex-ai-with-corporate-proxy)

Using Vertex AI with corporate proxy

Route Vertex AI traffic through a corporate HTTP/HTTPS proxy:

Report incorrect code

Copy

Ask AI
```

# Enable Vertex

export CLAUDE_CODE_USE_VERTEX=1
export CLOUD_ML_REGION=us-east5
export ANTHROPIC_VERTEX_PROJECT_ID=your-project-id

# Configure corporate proxy

export HTTPS_PROXY='https://proxy.example.com:8080'
```

###

[​


](#using-vertex-ai-with-llm-gateway)

Using Vertex AI with LLM Gateway

Combine Google Vertex AI models with an LLM gateway for centralized management:

Report incorrect code

Copy

Ask AI
```

# Enable Vertex

export CLAUDE_CODE_USE_VERTEX=1

# Configure LLM gateway

export ANTHROPIC_VERTEX_BASE_URL='https://your-llm-gateway.com/vertex'
export CLAUDE_CODE_SKIP_VERTEX_AUTH=1  # If gateway handles GCP auth
```

###

[​


](#authentication-configuration)

Authentication configuration

Claude Code uses the `ANTHROPIC_AUTH_TOKEN` for the `Authorization` header when needed. The `SKIP_AUTH` flags (`CLAUDE_CODE_SKIP_BEDROCK_AUTH`, `CLAUDE_CODE_SKIP_VERTEX_AUTH`) are used in LLM gateway scenarios where the gateway handles provider authentication.

##

[​


](#choosing-the-right-deployment-configuration)

Choosing the right deployment configuration

Consider these factors when selecting your deployment approach:

###

[​


](#direct-provider-access)

Direct provider access

Best for organizations that:

*   Want the simplest setup
*   Have existing AWS or GCP infrastructure
*   Need provider-native monitoring and compliance

###

[​


](#corporate-proxy)

Corporate proxy

Best for organizations that:

*   Have existing corporate proxy requirements
*   Need traffic monitoring and compliance
*   Must route all traffic through specific network paths

###

[​


](#llm-gateway)

LLM Gateway

Best for organizations that:

*   Need usage tracking across teams
*   Want to dynamically switch between models
*   Require custom rate limiting or budgets
*   Need centralized authentication management

##

[​


](#debugging)

Debugging

When debugging your deployment:

*   Use the `claude /status` [slash command](/docs/en/slash-commands). This command provides observability into any applied authentication, proxy, and URL settings.
*   Set environment variable `export ANTHROPIC_LOG=debug` to log requests.

##

[​


](#best-practices-for-organizations)

Best practices for organizations

###

[​


](#1-invest-in-documentation-and-memory)

1\. Invest in documentation and memory

We strongly recommend investing in documentation so that Claude Code understands your codebase. Organizations can deploy CLAUDE.md files at multiple levels:

*   **Organization-wide**: Deploy to system directories like `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) for company-wide standards
*   **Repository-level**: Create `CLAUDE.md` files in repository roots containing project architecture, build commands, and contribution guidelines. Check these into source control so all users benefit [Learn more](/docs/en/memory).

###

[​


](#2-simplify-deployment)

2\. Simplify deployment

If you have a custom development environment, we find that creating a “one click” way to install Claude Code is key to growing adoption across an organization.

###

[​


](#3-start-with-guided-usage)

3\. Start with guided usage

Encourage new users to try Claude Code for codebase Q&A, or on smaller bug fixes or feature requests. Ask Claude Code to make a plan. Check Claude’s suggestions and give feedback if it’s off-track. Over time, as users understand this new paradigm better, then they’ll be more effective at letting Claude Code run more agentically.

###

[​


](#4-configure-security-policies)

4\. Configure security policies

Security teams can configure managed permissions for what Claude Code is and is not allowed to do, which cannot be overwritten by local configuration. [Learn more](/docs/en/security).

###

[​


](#5-leverage-mcp-for-integrations)

5\. Leverage MCP for integrations

MCP is a great way to give Claude Code more information, such as connecting to ticket management systems or error logs. We recommend that one central team configures MCP servers and checks a `.mcp.json` configuration into the codebase so that all users benefit. [Learn more](/docs/en/mcp). At Anthropic, we trust Claude Code to power development across every Anthropic codebase. We hope you enjoy using Claude Code as much as we do.

##

[​


](#next-steps)

Next steps

*   [Set up Amazon Bedrock](/docs/en/amazon-bedrock) for AWS-native deployment
*   [Configure Google Vertex AI](/docs/en/google-vertex-ai) for GCP deployment
*   [Set up Microsoft Foundry](/docs/en/microsoft-foundry) for Azure deployment
*   [Configure Enterprise Network](/docs/en/network-config) for network requirements
*   [Deploy LLM Gateway](/docs/en/llm-gateway) for enterprise management
*   [Settings](/docs/en/settings) for configuration options and environment variables

Was this page helpful?

YesNo

[Amazon Bedrock](/docs/en/amazon-bedrock)

⌘I

[Claude Code Docs home page![light logo](https://mintcdn.com/claude-code/o69F7a6qoW9vboof/logo/light.svg?fit=max&auto=format&n=o69F7a6qoW9vboof&q=85&s=536eade682636e84231afce2577f9509)![dark logo](https://mintcdn.com/claude-code/o69F7a6qoW9vboof/logo/dark.svg?fit=max&auto=format&n=o69F7a6qoW9vboof&q=85&s=0766b3221061e80143e9f300733e640b)](/docs)

[x](https://x.com/AnthropicAI)[linkedin](https://www.linkedin.com/company/anthropicresearch)

Company

[Anthropic](https://www.anthropic.com/company)[Careers](https://www.anthropic.com/careers)[Economic Futures](https://www.anthropic.com/economic-futures)[Research](https://www.anthropic.com/research)[News](https://www.anthropic.com/news)[Trust center](https://trust.anthropic.com/)[Transparency](https://www.anthropic.com/transparency)

Help and security

[Availability](https://www.anthropic.com/supported-countries)[Status](https://status.anthropic.com/)[Support center](https://support.claude.com/)

Learn

[Courses](https://www.anthropic.com/learn)[MCP connectors](https://claude.com/partners/mcp)[Customer stories](https://www.claude.com/customers)[Engineering blog](https://www.anthropic.com/engineering)[Events](https://www.anthropic.com/events)[Powered by Claude](https://claude.com/partners/powered-by-claude)[Service partners](https://claude.com/partners/services)[Startups program](https://claude.com/programs/startups)

Terms and policies

[Privacy policy](https://www.anthropic.com/legal/privacy)[Disclosure policy](https://www.anthropic.com/responsible-disclosure-policy)[Usage policy](https://www.anthropic.com/legal/aup)[Commercial terms](https://www.anthropic.com/legal/commercial-terms)[Consumer terms](https://www.anthropic.com/legal/consumer-terms)