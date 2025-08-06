import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HttpHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as os from 'os';

@Controller('health')
@UseGuards(ThrottlerGuard)
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private http: HttpHealthIndicator,
  ) {}

  // ✅ Custom CPU Health Check
  private async checkCpuLoad(): Promise<HealthIndicatorResult> {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce(
      (acc, cpu) =>
        acc +
        cpu.times.user +
        cpu.times.nice +
        cpu.times.sys +
        cpu.times.irq +
        cpu.times.idle,
      0,
    );

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usagePercent = 1 - idle / total;

    const MAX_CPU_USAGE = 0.9; // 90%

    if (usagePercent > MAX_CPU_USAGE) {
      throw new Error(
        `CPU usage too high: ${(usagePercent * 100).toFixed(2)}%`,
      );
    }

    return {
      cpu: {
        status: 'up',
        usage: `${(usagePercent * 100).toFixed(2)}%`,
      },
    };
  }

  @Get()
  @HealthCheck()
  check() {
    const diskPath = os.platform() === 'win32' ? 'C:\\' : '/';

    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () =>
        this.disk.checkStorage('storage', {
          path: diskPath,
          thresholdPercent: 0.9,
        }),
      () => this.http.pingCheck('google', 'https://www.google.com'),
      () => this.checkCpuLoad(),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ]);
  }

  @Get('live')
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
