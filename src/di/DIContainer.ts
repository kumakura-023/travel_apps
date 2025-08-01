import { FirestorePlanRepository } from '../repositories/FirestorePlanRepository';
import { LocalStoragePlanRepository } from '../repositories/LocalStoragePlanRepository';
import { FirestoreUserRepository } from '../repositories/FirestoreUserRepository';
import { PlanService } from '../services/plan/PlanService';
import { ActivePlanService } from '../services/plan/ActivePlanService';
import { PlanCoordinator } from '../coordinators/PlanCoordinator';

export class DIContainer {
  private static instance: DIContainer;
  
  private firestorePlanRepository: FirestorePlanRepository;
  private localStoragePlanRepository: LocalStoragePlanRepository;
  private firestoreUserRepository: FirestoreUserRepository;
  
  private planService: PlanService;
  private activePlanService: ActivePlanService;
  
  private planCoordinator: PlanCoordinator;
  
  private constructor() {
    this.firestorePlanRepository = new FirestorePlanRepository();
    this.localStoragePlanRepository = new LocalStoragePlanRepository();
    this.firestoreUserRepository = new FirestoreUserRepository();
    
    this.planService = new PlanService(
      this.firestorePlanRepository,
      this.firestoreUserRepository,
      this.localStoragePlanRepository
    );
    
    this.activePlanService = new ActivePlanService(
      this.firestoreUserRepository
    );
    
    this.planCoordinator = new PlanCoordinator(
      this.planService,
      this.activePlanService
    );
  }
  
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }
  
  getPlanCoordinator(): PlanCoordinator {
    return this.planCoordinator;
  }
  
  getPlanService(): PlanService {
    return this.planService;
  }
}