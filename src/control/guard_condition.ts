import { TaskContext } from '../task/task_context';

export class GuardConditionCheckResult {

    constructor(public passed: boolean, public questionData: any = null) { }
}

export interface GuardCondition {

    check(
        ctx: TaskContext,
        refresh?: boolean
    ): Promise<GuardConditionCheckResult>;

    handleAnswer(
        ctx: TaskContext,
        answerData: any
    ): Promise<GuardConditionCheckResult>;
}

export class TaskGuardPair {
    constructor(public ctx: TaskContext, public gc: GuardCondition) { }
}
