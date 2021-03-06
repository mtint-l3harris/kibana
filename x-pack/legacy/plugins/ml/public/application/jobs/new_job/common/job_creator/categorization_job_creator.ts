/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';
import { SavedSearchSavedObject } from '../../../../../../common/types/kibana';
import { JobCreator } from './job_creator';
import { Field, Aggregation, mlCategory } from '../../../../../../common/types/fields';
import { Job, Datafeed, Detector } from './configs';
import { createBasicDetector } from './util/default_configs';
import {
  JOB_TYPE,
  CREATED_BY_LABEL,
  DEFAULT_BUCKET_SPAN,
  DEFAULT_RARE_BUCKET_SPAN,
} from '../../../../../../common/constants/new_job';
import { ML_JOB_AGGREGATION } from '../../../../../../common/constants/aggregation_types';
import { getRichDetectors } from './util/general';
import { CategorizationExamplesLoader, CategoryExample } from '../results_loader';
import { CategorizationAnalyzer, getNewJobDefaults } from '../../../../services/ml_server_info';

type CategorizationAnalyzerType = CategorizationAnalyzer | null;

export class CategorizationJobCreator extends JobCreator {
  protected _type: JOB_TYPE = JOB_TYPE.CATEGORIZATION;
  private _createCountDetector: () => void = () => {};
  private _createRareDetector: () => void = () => {};
  private _examplesLoader: CategorizationExamplesLoader;
  private _categoryFieldExamples: CategoryExample[] = [];
  private _categoryFieldValid: number = 0;
  private _detectorType: ML_JOB_AGGREGATION.COUNT | ML_JOB_AGGREGATION.RARE =
    ML_JOB_AGGREGATION.COUNT;
  private _categorizationAnalyzer: CategorizationAnalyzerType = null;
  private _defaultCategorizationAnalyzer: CategorizationAnalyzerType;

  constructor(
    indexPattern: IndexPattern,
    savedSearch: SavedSearchSavedObject | null,
    query: object
  ) {
    super(indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.CATEGORIZATION;
    this._examplesLoader = new CategorizationExamplesLoader(this, indexPattern, query);

    const { anomaly_detectors: anomalyDetectors } = getNewJobDefaults();
    this._defaultCategorizationAnalyzer = anomalyDetectors.categorization_analyzer || null;
  }

  public setDefaultDetectorProperties(
    count: Aggregation | null,
    rare: Aggregation | null,
    eventRate: Field | null
  ) {
    if (count === null || rare === null || eventRate === null) {
      return;
    }

    this._createCountDetector = () => {
      this._createDetector(count, eventRate);
    };
    this._createRareDetector = () => {
      this._createDetector(rare, eventRate);
    };
  }

  private _createDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = createBasicDetector(agg, field);
    dtr.by_field_name = mlCategory.id;
    this._addDetector(dtr, agg, mlCategory);
  }

  public setDetectorType(type: ML_JOB_AGGREGATION.COUNT | ML_JOB_AGGREGATION.RARE) {
    this._detectorType = type;
    this.removeAllDetectors();
    if (type === ML_JOB_AGGREGATION.COUNT) {
      this._createCountDetector();
      this.bucketSpan = DEFAULT_BUCKET_SPAN;
    } else {
      this._createRareDetector();
      this.bucketSpan = DEFAULT_RARE_BUCKET_SPAN;
      this.modelPlot = false;
    }
  }

  public set categorizationFieldName(fieldName: string | null) {
    if (fieldName !== null) {
      this._job_config.analysis_config.categorization_field_name = fieldName;
      this.setDetectorType(this._detectorType);
      this.addInfluencer(mlCategory.id);
    } else {
      delete this._job_config.analysis_config.categorization_field_name;
      this._categoryFieldExamples = [];
      this._categoryFieldValid = 0;
    }
  }

  public get categorizationFieldName(): string | null {
    return this._job_config.analysis_config.categorization_field_name || null;
  }

  public async loadCategorizationFieldExamples() {
    const { valid, examples } = await this._examplesLoader.loadExamples();
    this._categoryFieldExamples = examples;
    this._categoryFieldValid = valid;
    return { valid, examples };
  }

  public get categoryFieldExamples() {
    return this._categoryFieldExamples;
  }

  public get categoryFieldValid() {
    return this._categoryFieldValid;
  }

  public get selectedDetectorType() {
    return this._detectorType;
  }

  public set categorizationAnalyzer(analyzer: CategorizationAnalyzerType) {
    this._categorizationAnalyzer = analyzer;

    if (
      analyzer === null ||
      isEqual(this._categorizationAnalyzer, this._defaultCategorizationAnalyzer)
    ) {
      delete this._job_config.analysis_config.categorization_analyzer;
    } else {
      this._job_config.analysis_config.categorization_analyzer = analyzer;
    }
  }

  public get categorizationAnalyzer() {
    return this._categorizationAnalyzer;
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.CATEGORIZATION;
    const detectors = getRichDetectors(job, datafeed, this.scriptFields, false);

    const dtr = detectors[0];
    if (detectors.length && dtr.agg !== null && dtr.field !== null) {
      this._detectorType =
        dtr.agg.id === ML_JOB_AGGREGATION.COUNT
          ? ML_JOB_AGGREGATION.COUNT
          : ML_JOB_AGGREGATION.RARE;

      const bs = job.analysis_config.bucket_span;
      this.setDetectorType(this._detectorType);
      // set the bucketspan back to the original value
      // as setDetectorType applies a default
      this.bucketSpan = bs;
    }
  }
}
