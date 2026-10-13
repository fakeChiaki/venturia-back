import { AffinityCalculatorService } from './affinity-calculator.service';
import { Methodology } from '../../common/enums/methodology.enum';
import { ProfileSnapshot, ProjectSnapshot } from './interfaces/affinity.interfaces';

const SCRUM = 'scrum' as Methodology;
const KANBAN = 'kanban' as Methodology;

const profile = (over: Partial<ProfileSnapshot> = {}): ProfileSnapshot => ({
  technicalAreaIds: [],
  methodology: null,
  weeklyHours: null,
  roleIds: [],
  interestAreaIds: [],
  ...over,
});

const project = (over: Partial<ProjectSnapshot> = {}): ProjectSnapshot => ({
  id: 'p1',
  technicalAreaIds: [],
  methodology: SCRUM,
  weeklyHours: null,
  requiredRoleIds: [],
  interestAreaIds: [],
  ...over,
});

describe('AffinityCalculatorService', () => {
  let service: AffinityCalculatorService;

  beforeEach(() => {
    service = new AffinityCalculatorService();
  });

  it('un match perfecto da score 100', () => {
    const p = profile({
      technicalAreaIds: [1],
      methodology: SCRUM,
      weeklyHours: 40,
      roleIds: [1, 2],
      interestAreaIds: [5],
    });
    const pr = project({
      technicalAreaIds: [1],
      methodology: SCRUM,
      weeklyHours: 40,
      requiredRoleIds: [1, 2],
      interestAreaIds: [5],
    });
    expect(service.compute(p, pr).score).toBe(100);
  });

  it('proyecto sin requisitos: roles/intereses default 100, ponderado = 70', () => {
    const { score, breakdown } = service.compute(profile(), project());
    expect(breakdown.roles).toBe(100);
    expect(breakdown.interestAreas).toBe(100);
    expect(breakdown.technicalArea).toBe(0);
    expect(breakdown.methodology).toBe(0);
    expect(breakdown.weeklyHours).toBe(100);
    // 0.4*100 + 0.25*100 + 0.2*0 + 0.1*0 + 0.05*100
    expect(score).toBe(70);
  });

  describe('roles', () => {
    it('cubre proporción de los roles requeridos', () => {
      const { breakdown } = service.compute(
        profile({ roleIds: [1] }),
        project({ requiredRoleIds: [1, 2] }),
      );
      expect(breakdown.roles).toBe(50);
    });

    it('perfil sin roles pero el proyecto requiere → 0', () => {
      const { breakdown } = service.compute(
        profile({ roleIds: [] }),
        project({ requiredRoleIds: [1] }),
      );
      expect(breakdown.roles).toBe(0);
    });
  });

  describe('área técnica', () => {
    it('cualquier coincidencia → 100', () => {
      const { breakdown } = service.compute(
        profile({ technicalAreaIds: [1, 3] }),
        project({ technicalAreaIds: [3] }),
      );
      expect(breakdown.technicalArea).toBe(100);
    });

    it('sin coincidencia → 0', () => {
      const { breakdown } = service.compute(
        profile({ technicalAreaIds: [1] }),
        project({ technicalAreaIds: [2] }),
      );
      expect(breakdown.technicalArea).toBe(0);
    });
  });

  describe('metodología', () => {
    it('coincide → 100', () => {
      expect(
        service.compute(profile({ methodology: SCRUM }), project({ methodology: SCRUM }))
          .breakdown.methodology,
      ).toBe(100);
    });
    it('no coincide → 0', () => {
      expect(
        service.compute(profile({ methodology: KANBAN }), project({ methodology: SCRUM }))
          .breakdown.methodology,
      ).toBe(0);
    });
    it('perfil sin metodología → 0', () => {
      expect(
        service.compute(profile({ methodology: null }), project({ methodology: SCRUM }))
          .breakdown.methodology,
      ).toBe(0);
    });
  });

  describe('horas semanales', () => {
    it('el proyecto no declara horas → 100', () => {
      expect(
        service.compute(profile({ weeklyHours: 5 }), project({ weeklyHours: null }))
          .breakdown.weeklyHours,
      ).toBe(100);
    });
    it('perfil cumple o supera → 100', () => {
      expect(
        service.compute(profile({ weeklyHours: 40 }), project({ weeklyHours: 20 }))
          .breakdown.weeklyHours,
      ).toBe(100);
    });
    it('perfil por debajo → proporcional', () => {
      expect(
        service.compute(profile({ weeklyHours: 10 }), project({ weeklyHours: 20 }))
          .breakdown.weeklyHours,
      ).toBe(50);
    });
    it('perfil sin horas pero el proyecto requiere → 0', () => {
      expect(
        service.compute(profile({ weeklyHours: null }), project({ weeklyHours: 20 }))
          .breakdown.weeklyHours,
      ).toBe(0);
    });
  });
});
