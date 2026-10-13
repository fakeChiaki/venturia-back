import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('technical_areas')
export class TechnicalArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;
}
