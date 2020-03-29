import { Injectable } from '@angular/core';
import { WORLD, INTERVAL } from './constants';
import { Observable, Subject } from 'rxjs';

class Direction {
  private LEFT: number[] = [-1, 0];
  private RIGHT: number[] = [1, 0];
  private UP: number[] = [0, 1];
  private DOWN: number[] = [0, -1];
  private LEFT_UP: number[] = [-1, 1];
  private LEFT_DOWN: number[] = [-1, -1];
  private RIGHT_UP: number[] = [1, 1];
  private RIGHT_DOWN: number[] = [1, -1];
  private actualDirection: number[];
  private allowedTravel: number;

  constructor(unitTravelDistance: number) {
    this.allowedTravel = unitTravelDistance;
    this.switchDirection();
  }

  public getNextPosition(startingPosition: Position, actualPosition: Position): Position {
    const nextPosition = new Position(
      actualPosition.x + this.actualDirection[0],
      actualPosition.y + this.actualDirection[1]
    );
    if (this.isInRange(startingPosition, nextPosition)) {
      return nextPosition;
    }
    this.switchDirection();
    return actualPosition;
  }

  private isInRange(startingPosition: Position, actualPosition: Position): boolean {
    const borders = [startingPosition.x + this.allowedTravel, startingPosition.y + this.allowedTravel];
    const isXInUnitBorders = actualPosition.x >= startingPosition.x && actualPosition.x <= borders[0];
    const isYInUnitBorders = actualPosition.y >= startingPosition.y && actualPosition.y <= borders[1];
    const isXInWorldBorders = actualPosition.x >= 0 && actualPosition.x <= WORLD.width;
    const isYInWorldBorders = actualPosition.x >= 0 && actualPosition.y <= WORLD.height;
    return isXInUnitBorders && isYInUnitBorders && isXInWorldBorders && isYInWorldBorders;
  }

  private switchDirection() {
    const choices = [
      this.DOWN,
      this.UP,
      this.LEFT,
      this.RIGHT,
      this.LEFT_DOWN,
      this.LEFT_UP,
      this.RIGHT_DOWN,
      this.RIGHT_UP,
    ];
    this.actualDirection = choices[Math.floor(Math.random() * (choices.length - 1))];
  }
}

export enum Color {
  RED = '#ff3300',
  GREEN = '#00ff00',
  YELLOW = '#ffff00',
  BLACK = '#000000',
}

export class Position {
  constructor(public x: number, public y: number) {}

  public inRange(position: Position, radius: number): boolean {
    const dist = Math.sqrt(Math.pow(this.x - position.x, 2) + Math.pow(this.y - position.y, 2));
    return dist < radius;
  }
}

export class DrawingPosition extends Position {
  constructor(public x: number, public y: number, public color: Color) {
    super(x, y);
  }
}

enum State {
  INFECTED,
  DEAD,
  NONINFECTED,
  IMMUNE,
}

export interface Human {
  drawingPosition: DrawingPosition;
  startingPosition: Position;
  direction: Direction;
  state: State;
  tick: number;
}

export interface EpochAssumption {
  sick: number;
  immune: number;
  dead: number;
}

@Injectable({
  providedIn: 'root',
})
export class PopulationService {
  private populationSize: number;
  private unitBoxSize: number;
  private infectionProbability: number; // 0 to 100 %
  private infectionRadius: number; // 1 to 20 range
  private deathRate: number; // 0 to 100 %
  private sicknessInterval: number; // in one tick where one tick is one change in population state
  private runningSimulation: boolean = false;
  private population: Human[] = [];
  private infectedAtStart: number;
  private epoch: Subject<Human[]> = new Subject<Human[]>();
  private assumption: Subject<EpochAssumption> = new Subject<EpochAssumption>();
  private epochAssumption: EpochAssumption;

  constructor() {}

  public startNewSimulation(
    populationSize: number = 100,
    unitBoxSize: number = 25,
    infectionProbability: number = 90,
    infectionRadius: number = 100,
    deathRate: number = 10,
    sicknessInterval: number = 10,
    infectedAtStart: number = Math.floor(populationSize / 10)
  ) {
    if (this.runningSimulation) {
      return;
    }
    this.populationSize = populationSize >= 10 ? (populationSize <= 1000 ? populationSize : 1000) : 10;
    this.unitBoxSize =
      unitBoxSize > 25
        ? unitBoxSize <= (WORLD.width + WORLD.height) / 2
          ? unitBoxSize
          : (WORLD.width + WORLD.height) / 2
        : 25;
    this.infectionProbability =
      infectionProbability > 10 ? infectionProbability <= 100 ? infectionProbability : 100 : 10;
    this.infectionRadius = infectionRadius > 5 ? (infectionRadius <= 100 ? infectionRadius : 100) : 5;
    this.deathRate = deathRate > 0 ? (deathRate <= 100 ? deathRate : 100) : 1;
    this.sicknessInterval = sicknessInterval > 5 ? sicknessInterval <= 70 ? sicknessInterval : 70 : 5;
    this.infectedAtStart =
      infectedAtStart > 0 ? (infectedAtStart < populationSize / 2 ? infectedAtStart : populationSize / 2) : 1;
    this.runningSimulation = true;
    this.setConditions();
    this.runSimulation();
  }

  public stopSimulation() {
    this.runningSimulation = false;
  }

  public epochListener(): Observable<Human[]> {
    return this.epoch.asObservable();
  }

  public assumptionListener(): Observable<EpochAssumption> {
    return this.assumption.asObservable();
  }

  private setEpoch(): void {
    this.epoch.next(this.population);
  }

  private setConditions(): void {
    let counter = this.infectedAtStart + 1;
    this.population = new Array(this.populationSize).fill(0).map((_) => {
      counter--;
      let state = State.NONINFECTED;
      let color = Color.GREEN;
      if (counter > 0) {
        state = State.INFECTED;
        color = Color.RED;
      }
      const drawPos = new DrawingPosition(
        this.randomizeRange(0, WORLD.width),
        this.randomizeRange(0, WORLD.height),
        color
      );

      return <Human>{
        drawingPosition: drawPos,
        startingPosition: new Position(drawPos.x, drawPos.y),
        direction: new Direction(this.unitBoxSize),
        state: state,
        tick: this.sicknessInterval,
      };
    });
  }

  private randomizeRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async runSimulation() {
    while (this.runningSimulation) {
      this.applyTick();
      this.assumption.next(this.epochAssumption);
      await this.delay(INTERVAL);
    }
  }

  private applyTick() {
    const infectedPopulation: Position[] = [];
    this.epochAssumption = {
      sick: 0,
      immune: 0,
      dead: 0,
    };
    this.population.forEach((human: Human) => {
      if (human.state === State.INFECTED) {
        infectedPopulation.push(<Position>human.drawingPosition);
      }
    });
    this.population.forEach((human: Human) => {

      if (human.state !== State.DEAD) {
        const pos: Position = human.direction.getNextPosition(human.startingPosition, <Position>human.drawingPosition);
        if (human.state === State.INFECTED) {
          if (human.tick === 0) {
            human.state = this.willRecover() ? State.IMMUNE : State.DEAD;
            if (human.state === State.DEAD) {
              human.drawingPosition.color = Color.BLACK;
              this.epochAssumption.dead++;
            } else {
              human.drawingPosition.color = Color.YELLOW;
            }
          }
          human.tick--;
        }

        if (human.state === State.NONINFECTED) {
          if (this.becomesInfected(human.drawingPosition, infectedPopulation)) {
            human.state = State.INFECTED;
            human.drawingPosition.color = Color.RED;
            human.tick = this.sicknessInterval;
          }
        }

        if (human.state === State.INFECTED) {
          this.epochAssumption.sick++;
          human.drawingPosition.color = Color.RED;
        }

        if (human.state === State.IMMUNE) {
          this.epochAssumption.immune++;
          human.drawingPosition.color = Color.YELLOW;
        }

        human.drawingPosition.x = pos.x;
        human.drawingPosition.y = pos.y;
      } else {
        this.epochAssumption.dead++;
        human.drawingPosition.color = Color.BLACK;
      }

    });
    this.setEpoch();
  }

  private willRecover(): boolean {
    return this.randomizeRange(0, 100) > this.deathRate;
  }

  private becomesInfected(position: Position, infectedPopulation: Position[]): boolean {
    let inRange = false;
    infectedPopulation.forEach((zone: Position) => {
      if (position.inRange(zone, this.infectionRadius)) {
        inRange = true;
      }
    });
    return inRange && Math.random() * 100 < this.infectionProbability;
  }
}
