# Flytrap Bootstrap

This is a brand new project for a tooling to aid in local development whenever you have to work with queues:

 - kafka
 - pubsub
 - redis pubsub
 - rabbitmq
 - etc.

The overall strategy is:

 - Subscribe to available topics on the configured pubsub systems
 - Use watermill router handlers to consume messages
 - Persist data to a sqlite database
 - Make the consumed messages/events available through an API
 - Allow viewing messages through an UI

## Goal

The goal here is to bootstrap this project. We are building a "walking skeleton": the minimal
infrastructure required to validate the project architecture.

This walking skeleton is fully testable and ready to improve upon.

## Stack

 - Golang as main language. It is the backend and pubsub monitor.
 - Frontend with daisy-ui and react
 - Watermill with router component to subscribe to multiple topics
 - Sqlite as persistent database to store received messages
 - `arquivei/errors` as errors abstraction
 - testify for golang tests
 - vitest for frontend and testing-library
 - React 19 for the frontend
 - daisy ui 5

## Architecture

```
backend/
  cmd/ # package main and entrypoint
    main.go # Serves the api and frontend
  internal/ # internal packages
    api/ # api route handlers
    sub/ # subscribers for the pubsubs
    app/ # Application hosted. Embedds the built artifact by the frontend
frontend/ # Frontend code
  components/ # Dumb components
  feature/
    <feature-name>/
      components/ # high level components. Orchestrate hoos and dumb components
      hooks/
e2e/ # End-to-end tests with playwright
Taskfile.yml # Orchestrate the setup, tests, linters, dev environment, etc.
docker-compose.yaml # Local development orchestration (frontend dev server, `go run`, pubsub queues, etc)
```

The frontend built artifacts are embedded into backend/app/. The goal here is enabling a single dependency-free binary.

## Walking skeleton

The walking skeleton is the final goal of this task. It is the "minimum viable product" that exercises the architecture and allows me to work and improve upon it.

For this case, I want:

 - The overall folder structure: backend, frontend, e2e, taskfile
 - A simple frontend with daisy ui that renders a hello world. The frontend should enable all daisy ui themes and use theme-switcher to allow the user to select the desired theme.
 - The final built frontend should be embedded into the go binary. More specifically, the embedded files go into the backend/internal/app package. The cmd spins-up the 

## Important details

 - You MUST use context7 to search for the most up-to-date documentation

## DON'T Do

 - Do not overengineer: the focus here is the walking skeleton, a minimum viable infrastructure that validates the proposed architecture
 - Do not add sqlite, or any pubsub: the focus is on the walkign skeleton

## Acceptance Criteria

 - End-to-End tests with playwright, exercising the system through its external ports. The first test should validate that the frontend is properly embedded into the go application.
 - Golangci-lint pasing
 - Go unit tests
 - Frontend component tests
 - Use terryyin/lizard to calculate cyclomatic complexity and have a threshold of < 20
 - A single commands `task dev` that starts all the required services and results in a working application
 - Working and passing end-to-end test

## Approach

Use Agent teams to orchestrate this development.

We will have the following team members:

 - Frontend Dev: responsible for bootstrapping the frontend
 - Backend Dev: responsible for bootstrapping the backend
 - QA: responsible for configuring and writing the end-to-end tests and analysing the final result
 - Reviewer: responsible for reviweing and juding all the generated artifacts

