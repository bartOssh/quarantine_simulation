import { Component, OnInit, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { WORLD } from '../shared/constants';
import { PopulationService, Human, DrawingPosition, EpochAssumption } from '../shared/population.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

export enum FinishCondition {
  DEAD = 'Dead',
  IMMUNE = 'Immune',
  SICK = 'Sick',
}

export interface FinishConditions {
  condition: FinishCondition;
  percent: number;
}

@Component({
  selector: 'app-solver',
  templateUrl: './solver.component.html',
  styleUrls: ['./solver.component.sass'],
})
export class SolverComponent implements OnInit, OnDestroy {
  public isSimulationRunning: boolean = false;
  public assumption: EpochAssumption = {
    dead: 0,
    sick: 0,
    immune: 0,
  };
  public ticks: number = 0;

  public totalPopulation: number = 200;
  public unitBox: number = 30;
  public infectionProbability: 10;
  public infectionRadius: number = 10;
  public deathRate: number = 10;
  public infectionInterval: number = 10;
  public infectedAtStart: number = 10;
  public conditions: FinishConditions = { condition: FinishCondition.DEAD, percent: 55 };
  public isConditionMet = false;
  public info: string = 'Ready!';
  private radius: number = 5;
  private subscriptionDestructor: Subject<void> = new Subject<void>();

  private static getPercentage(value: number, population: number): number {
    return (value / population) * 100;
  }

  constructor(private populationService: PopulationService) {}

  ngOnInit(): void {
    const svg = d3.select('svg').attr('width', WORLD.width).attr('height', WORLD.height).style('background', 'grey');
    this.populationService
      .epochListener()
      .pipe(takeUntil(this.subscriptionDestructor))
      .subscribe((population: Human[]) => {
        const positions = population.map(
          (human: Human): DrawingPosition => {
            return human.drawingPosition;
          }
        );
        this.draw(svg, positions);
      });
    this.populationService
      .assumptionListener()
      .pipe(takeUntil(this.subscriptionDestructor))
      .subscribe((assumption: EpochAssumption) => {
        this.assumption = assumption;
        this.ticks++;
        if (this.isSimulationFinished()) {
          this.stop();
          this.isConditionMet = true;
        } else if (this.assumption.sick === 0) {
          this.stop();
          this.info = 'No more infected cases, population has recovered totally';
        }
      });
  }

  ngOnDestroy(): void {
    this.subscriptionDestructor.next();
    this.subscriptionDestructor = null;
  }

  public start() {
    this.ticks = 0;
    this.populationService.startNewSimulation(
      this.totalPopulation,
      this.unitBox,
      this.infectionProbability,
      this.infectionRadius,
      this.deathRate,
      this.infectionInterval,
      Math.floor(this.infectedAtStart / 100 * this.totalPopulation) 
    );
    this.isSimulationRunning = true;
    this.isConditionMet = false;
    this.info = 'Running simulation...';
  }

  public stop() {
    this.populationService.stopSimulation();
    this.isSimulationRunning = false;
    this.info = 'Ready!';
  }

  private isSimulationFinished(): boolean {
    switch (this.conditions.condition) {
      case FinishCondition.DEAD:
        return SolverComponent.getPercentage(this.assumption.dead, this.totalPopulation) >= this.conditions.percent;
      case FinishCondition.IMMUNE:
        return SolverComponent.getPercentage(this.assumption.immune, this.totalPopulation) >= this.conditions.percent;
      case FinishCondition.SICK:
        return SolverComponent.getPercentage(this.assumption.sick, this.totalPopulation) >= this.conditions.percent;
    }
  }

  private draw(svg: any, positions: DrawingPosition[]): void {
    svg.selectAll('circle').remove();
    svg
      .selectAll('g')
      .data(positions)
      .enter()
      .append('circle')
      .attr('cy', (d, i) => d.x)
      .attr('cx', (d, i) => d.y)
      .attr('r', this.radius)
      .style('fill', (d, i) => d.color);
  }
}
