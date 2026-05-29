import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DocumentBuilder as _ } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(PinoLogger));
  app.use(helmet());
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('v1');
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // WebSocket → use Redis adapter so multiple backend pods can broadcast to each other.
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const pub = new IORedis(redisUrl);
  const sub = pub.duplicate();
  const ioAdapter = new IoAdapter(app);
  (ioAdapter as any).createIOServer = function (port: number, opts?: any) {
    const server = IoAdapter.prototype.createIOServer.call(this, port, opts);
    server.adapter(createAdapter(pub, sub));
    return server;
  };
  app.useWebSocketAdapter(ioAdapter);

  const swagger = new DocumentBuilder()
    .setTitle('Islamic Smart Assistant API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
