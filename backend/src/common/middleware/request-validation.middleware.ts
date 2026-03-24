import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestValidationMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction): void {
    // Log incoming requests
    this.logger.log(`${req.method} ${req.path} - IP: ${req.ip}`);

    // Validate Content-Type for POST/PUT/PATCH requests
    if (
      ['POST', 'PUT', 'PATCH'].includes(req.method) &&
      !req.is('application/json') &&
      !req.is('multipart/form-data') // allow file uploads
    ) {
      this.logger.warn(
        `Invalid Content-Type for ${req.method} ${req.path}: ${req.get('content-type')}`,
      );
      throw new BadRequestException(
        'Content-Type must be application/json or multipart/form-data',
      );
    }

    // Add timestamp to request
    (req as Request & { receivedAt?: Date }).receivedAt = new Date();

    next();
  }
}
