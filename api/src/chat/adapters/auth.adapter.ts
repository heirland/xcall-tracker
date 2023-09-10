import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

export class AuthIoAdapter extends IoAdapter {
  constructor(private app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: any): any {
    options.allowRequest = async (request, allowFunction) => {
      return allowFunction(null, true);
    };

    return super.createIOServer(port, options);
  }
}
