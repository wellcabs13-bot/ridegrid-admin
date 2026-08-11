# RideGrid Production Operations

## Backups
Use managed PostgreSQL automated backups plus periodic restore testing.

## Recovery
- Keep database backups independent of application deployments.
- Test restore procedures regularly.
- Keep the previous application deployment available for rollback.

## Monitoring
- Application errors and request logs
- Database health
- Deployment status
- `/api/health`
- Booking/payment failure rates
- Notification delivery failures

## Security
- Production secrets only through the deployment provider's secret store.
- Rotate `JWT_SECRET` through a controlled release.
- Keep dependencies updated and CI green.
