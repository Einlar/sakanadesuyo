# Deployment

This app is configured for **zero-downtime** deployments on CapRover. To ensure
that long-running operations (like song analysis) are not interrupted during a
deployment, you MUST configure the **Service Update Override** in CapRover.

Go to your App > **Service Configuration** > **Service Update Override** and
add:

```json
{
    "TaskTemplate": {
        "ContainerSpec": {
            "StopGracePeriod": 300000000000
        }
    },
    "UpdateConfig": {
        "Order": "start-first"
    }
}
```

- `StopGracePeriod`: 300 seconds (in nanoseconds). Tells Docker to wait 5
  minutes after `SIGTERM` before killing the container.
- `Order`: `start-first`. Tells Docker to start the new container and ensure
  it's healthy _before_ stopping the old one.
