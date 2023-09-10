import { IsString } from 'class-validator';

export class EventDto {
  @IsString()
  contractId: string;

  @IsString()
  key: string;

  @IsString()
  data: string;
}
