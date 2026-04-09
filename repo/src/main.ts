import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { TraceIdInterceptor } from './common/interceptors/trace-id.interceptor';
import { MaskingInterceptor } from './common/interceptors/masking.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const auditService = app.get('AuditService', { strict: false });
  const traceInterceptor = new TraceIdInterceptor();

  app.useGlobalInterceptors(
    traceInterceptor,
    new ResponseInterceptor(),
    new MaskingInterceptor(),
    new AuditInterceptor(auditService),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
