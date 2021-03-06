/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { memo, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { StickyContainer } from 'react-sticky';

import { ActionCreator } from 'typescript-fsa';
import { connect } from 'react-redux';
import { FiltersGlobal } from '../../../../components/filters_global';
import { FormattedDate } from '../../../../components/formatted_date';
import { HeaderPage } from '../../../../components/header_page';
import { DETECTION_ENGINE_PAGE_NAME } from '../../../../components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../../../components/search_bar';
import { WrapperPage } from '../../../../components/wrapper_page';
import { useRule } from '../../../../containers/detection_engine/rules';

import {
  indicesExistOrDataTemporarilyUnavailable,
  WithSource,
} from '../../../../containers/source';
import { SpyRoute } from '../../../../utils/route/spy_routes';

import { SignalsHistogramPanel } from '../../components/signals_histogram_panel';
import { SignalsTable } from '../../components/signals';
import { DetectionEngineEmptyPage } from '../../detection_engine_empty_page';
import { useSignalInfo } from '../../components/signals_info';
import { StepAboutRule } from '../components/step_about_rule';
import { StepDefineRule } from '../components/step_define_rule';
import { StepScheduleRule } from '../components/step_schedule_rule';
import { buildSignalsRuleIdFilter } from '../../components/signals/default_config';
import * as detectionI18n from '../../translations';
import { RuleSwitch } from '../components/rule_switch';
import { StepPanel } from '../components/step_panel';
import { getStepsData } from '../helpers';
import * as ruleI18n from '../translations';
import * as i18n from './translations';
import { GlobalTime } from '../../../../containers/global_time';
import { signalsHistogramOptions } from '../../components/signals_histogram_panel/config';
import { InputsModelId } from '../../../../store/inputs/constants';
import { esFilters } from '../../../../../../../../../src/plugins/data/common/es_query';
import { Query } from '../../../../../../../../../src/plugins/data/common/query';
import { inputsSelectors } from '../../../../store/inputs';
import { State } from '../../../../store';
import { InputsRange } from '../../../../store/inputs/model';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../../../store/inputs/actions';

interface OwnProps {
  signalsIndex: string | null;
}

interface ReduxProps {
  filters: esFilters.Filter[];
  query: Query;
}

export interface DispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

type RuleDetailsComponentProps = OwnProps & ReduxProps & DispatchProps;

const RuleDetailsComponent = memo<RuleDetailsComponentProps>(
  ({ filters, query, setAbsoluteRangeDatePicker, signalsIndex }) => {
    const { ruleId } = useParams();
    const [loading, rule] = useRule(ruleId);
    const { aboutRuleData, defineRuleData, scheduleRuleData } = getStepsData({
      rule,
      detailsView: true,
    });
    const [lastSignals] = useSignalInfo({ ruleId });

    const title = loading === true || rule === null ? <EuiLoadingSpinner size="m" /> : rule.name;
    const subTitle = useMemo(
      () =>
        loading === true || rule === null ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          [
            <FormattedMessage
              id="xpack.siem.detectionEngine.ruleDetails.ruleCreationDescription"
              defaultMessage="Created by: {by} on {date}"
              values={{
                by: rule?.created_by ?? i18n.UNKNOWN,
                date: (
                  <FormattedDate
                    value={rule?.created_at ?? new Date().toISOString()}
                    fieldName="createdAt"
                  />
                ),
              }}
            />,
            rule?.updated_by != null ? (
              <FormattedMessage
                id="xpack.siem.detectionEngine.ruleDetails.ruleUpdateDescription"
                defaultMessage="Updated by: {by} on {date}"
                values={{
                  by: rule?.updated_by ?? i18n.UNKNOWN,
                  date: (
                    <FormattedDate
                      value={rule?.updated_at ?? new Date().toISOString()}
                      fieldName="updatedAt"
                    />
                  ),
                }}
              />
            ) : (
              ''
            ),
          ]
        ),
      [loading, rule]
    );

    const signalDefaultFilters = useMemo(
      () => (ruleId != null ? buildSignalsRuleIdFilter(ruleId) : []),
      [ruleId]
    );

    const signalMergedFilters = useMemo(() => [...signalDefaultFilters, ...filters], [
      signalDefaultFilters,
      filters,
    ]);

    const updateDateRangeCallback = useCallback(
      (min: number, max: number) => {
        setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
      },
      [setAbsoluteRangeDatePicker]
    );

    return (
      <>
        <WithSource sourceId="default">
          {({ indicesExist, indexPattern }) => {
            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <GlobalTime>
                {({ to, from }) => (
                  <StickyContainer>
                    <FiltersGlobal>
                      <SiemSearchBar id="global" indexPattern={indexPattern} />
                    </FiltersGlobal>

                    <WrapperPage>
                      <HeaderPage
                        backOptions={{
                          href: `#${DETECTION_ENGINE_PAGE_NAME}/rules`,
                          text: i18n.BACK_TO_RULES,
                        }}
                        badgeOptions={{ text: i18n.EXPERIMENTAL }}
                        border
                        subtitle={subTitle}
                        subtitle2={[
                          lastSignals != null ? (
                            <>
                              {detectionI18n.LAST_SIGNAL}
                              {': '}
                              {lastSignals}
                            </>
                          ) : null,
                          'Status: Comming Soon',
                        ]}
                        title={title}
                      >
                        <EuiFlexGroup alignItems="center">
                          <EuiFlexItem grow={false}>
                            <RuleSwitch
                              id={rule?.id ?? '-1'}
                              enabled={rule?.enabled ?? false}
                              optionLabel={i18n.ACTIVATE_RULE}
                            />
                          </EuiFlexItem>

                          <EuiFlexItem grow={false}>
                            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                              <EuiFlexItem grow={false}>
                                <EuiButton
                                  href={`#${DETECTION_ENGINE_PAGE_NAME}/rules/id/${ruleId}/edit`}
                                  iconType="visControls"
                                  isDisabled={rule?.immutable ?? true}
                                >
                                  {ruleI18n.EDIT_RULE_SETTINGS}
                                </EuiButton>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </HeaderPage>

                      <EuiSpacer />

                      <EuiFlexGroup>
                        <EuiFlexItem component="section" grow={1}>
                          <StepPanel loading={loading} title={ruleI18n.DEFINITION}>
                            {defineRuleData != null && (
                              <StepDefineRule
                                descriptionDirection="column"
                                isReadOnlyView={true}
                                isLoading={false}
                                defaultValues={defineRuleData}
                              />
                            )}
                          </StepPanel>
                        </EuiFlexItem>

                        <EuiFlexItem component="section" grow={2}>
                          <StepPanel loading={loading} title={ruleI18n.ABOUT}>
                            {aboutRuleData != null && (
                              <StepAboutRule
                                descriptionDirection="column"
                                isReadOnlyView={true}
                                isLoading={false}
                                defaultValues={aboutRuleData}
                              />
                            )}
                          </StepPanel>
                        </EuiFlexItem>

                        <EuiFlexItem component="section" grow={1}>
                          <StepPanel loading={loading} title={ruleI18n.SCHEDULE}>
                            {scheduleRuleData != null && (
                              <StepScheduleRule
                                descriptionDirection="column"
                                isReadOnlyView={true}
                                isLoading={false}
                                defaultValues={scheduleRuleData}
                              />
                            )}
                          </StepPanel>
                        </EuiFlexItem>
                      </EuiFlexGroup>

                      <EuiSpacer />
                      <SignalsHistogramPanel
                        filters={signalMergedFilters}
                        query={query}
                        from={from}
                        stackByOptions={signalsHistogramOptions}
                        to={to}
                        updateDateRange={updateDateRangeCallback}
                      />

                      <EuiSpacer />

                      {ruleId != null && (
                        <SignalsTable
                          defaultFilters={signalDefaultFilters}
                          from={from}
                          signalsIndex={signalsIndex ?? ''}
                          to={to}
                        />
                      )}
                    </WrapperPage>
                  </StickyContainer>
                )}
              </GlobalTime>
            ) : (
              <WrapperPage>
                <HeaderPage border title={i18n.PAGE_TITLE} />

                <DetectionEngineEmptyPage />
              </WrapperPage>
            );
          }}
        </WithSource>

        <SpyRoute />
      </>
    );
  }
);

RuleDetailsComponent.displayName = 'RuleDetailsComponent';

const makeMapStateToProps = () => {
  const getGlobalInputs = inputsSelectors.globalSelector();
  return (state: State) => {
    const globalInputs: InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;

    return {
      query,
      filters,
    };
  };
};

export const RuleDetails = connect(makeMapStateToProps, {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
})(RuleDetailsComponent);

RuleDetails.displayName = 'RuleDetails';
