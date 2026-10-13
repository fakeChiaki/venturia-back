import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interest_areas')
export class InterestArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;
}
