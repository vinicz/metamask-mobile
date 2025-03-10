import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  SafeAreaView,
  Linking,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import {
  fontStyles,
  colors as staticColors,
} from '../../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../../UI/Navbar';
import { strings } from '../../../../../../locales/i18n';
import Networks, {
  isprivateConnection,
  getAllNetworks,
  getIsNetworkOnboarded,
} from '../../../../../util/networks';
import { getEtherscanBaseUrl } from '../../../../../util/etherscan';
import Engine from '../../../../../core/Engine';
import { isWebUri } from 'valid-url';
import URL from 'url-parse';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import BigNumber from 'bignumber.js';
import { jsonRpcRequest } from '../../../../../util/jsonRpcRequest';
import Logger from '../../../../../util/Logger';
import { isPrefixedFormattedHexString } from '../../../../../util/number';
import AppConstants from '../../../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import AnalyticsV2 from '../../../../../util/analyticsV2';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import PopularList from '../../../../../util/networks/customNetworks';
import WarningMessage from '../../../confirmations/SendFlow/WarningMessage';
import InfoModal from '../../../../UI/Swaps/components/InfoModal';
import {
  DEFAULT_MAINNET_CUSTOM_NAME,
  MAINNET,
  NETWORKS_CHAIN_ID,
  PRIVATENETWORK,
  RPC,
} from '../../../../../constants/network';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import { showNetworkOnboardingAction } from '../../../../../actions/onboardNetwork';
import sanitizeUrl, {
  compareSanitizedUrl,
} from '../../../../../util/sanitizeUrl';
import hideKeyFromUrl from '../../../../../util/hideKeyFromUrl';
import { themeAppearanceLight } from '../../../../../constants/storage';
import { scale, moderateScale } from 'react-native-size-matters';
import CustomNetwork from './CustomNetworkView/CustomNetwork';
import generateTestId from '../../../../../../wdio/utils/generateTestId';
import {
  INPUT_CHAIN_ID_FIELD,
  INPUT_RPC_URL_FIELD,
  INPUT_NETWORK_NAME,
  NETWORKS_SYMBOL_INPUT_FIELD,
  BLOCK_EXPLORER_FIELD,
  REMOVE_NETWORK_BUTTON,
  CUSTOM_NETWORKS_TAB_ID,
  POPULAR_NETWORKS_TAB_ID,
  RPC_WARNING_BANNER_ID,
} from '../../../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../../../selectors/networkController';
import { regex } from '../../../../../../app/util/regex';
import { NetworksViewSelectorsIDs } from '../../../../../../e2e/selectors/Settings/NetworksView.selectors';
import { isSafeChainId, toHex } from '@metamask/controller-utils';

const createStyles = (colors) =>
  StyleSheet.create({
    base: {
      paddingHorizontal: 16,
    },
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      flexDirection: 'column',
    },
    informationWrapper: {
      flex: 1,
    },
    informationCustomWrapper: {
      paddingHorizontal: 20,
    },
    scrollWrapper: {
      flex: 1,
      paddingVertical: 12,
    },
    onboardingInput: {
      borderColor: staticColors.transparent,
      padding: 0,
    },
    input: {
      ...fontStyles.normal,
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      padding: 10,
      color: colors.text.default,
    },
    warningText: {
      ...fontStyles.normal,
      color: colors.error.default,
      marginTop: 4,
      paddingLeft: 2,
      paddingRight: 4,
    },
    warningContainer: {
      marginTop: 16,
      flexGrow: 1,
      flexShrink: 1,
    },
    label: {
      fontSize: 14,
      paddingVertical: 12,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    title: {
      fontSize: 20,
      paddingVertical: 12,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    desc: {
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    buttonsWrapper: {
      marginVertical: 12,
      flexDirection: 'row',
      alignSelf: 'flex-end',
    },
    buttonsContainer: {
      flex: 1,
      flexDirection: 'column',
      alignSelf: 'flex-end',
    },
    editableButtonsContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    networksWrapper: {
      marginTop: 12,
      paddingHorizontal: 20,
    },
    popularNetwork: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 12,
    },
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.primary.default,
    },
    tabStyle: {
      paddingVertical: 8,
    },
    textStyle: {
      ...fontStyles.bold,
      fontSize: 14,
    },
    tabLabelStyle: {
      fontSize: scale(11),
    },
    popularNetworkImage: {
      width: 20,
      height: 20,
      marginRight: 10,
      borderRadius: 10,
    },
    popularWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: moderateScale(12, 1.5),
      marginTop: 4,
    },
    button: {
      flex: 1,
    },
    disabledButton: {
      backgroundColor: colors.primary.muted,
    },
    cancel: {
      marginRight: 16,
    },
    blueText: {
      color: colors.primary.default,
      marginTop: 1,
    },
  });

const allNetworks = getAllNetworks();
const allNetworksblockExplorerUrl = (networkName) =>
  `https://${networkName}.infura.io/v3/`;

/**
 * Main view for app configurations
 */
class NetworkSettings extends PureComponent {
  static propTypes = {
    /**
     * Network configurations
     */
    networkConfigurations: PropTypes.object,
    /**
     * Object that represents the navigator
     */
    navigation: PropTypes.object,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    /**
     * handles action for onboarding to a network
     */
    showNetworkOnboardingAction: PropTypes.func,
    /**
     * returns an array of onboarded networks
     */
    networkOnboardedState: PropTypes.object,
    /**
     * Checks if adding custom mainnet.
     */
    isCustomMainnet: PropTypes.bool,
    /**
     * Current network provider configuration
     */
    providerConfig: PropTypes.object,
  };

  state = {
    rpcUrl: undefined,
    blockExplorerUrl: undefined,
    nickname: undefined,
    chainId: undefined,
    ticker: undefined,
    editable: undefined,
    addMode: false,
    warningRpcUrl: undefined,
    warningChainId: undefined,
    warningSymbol: undefined,
    validatedRpcURL: true,
    validatedChainId: true,
    validatedSymbol: true,
    initialState: undefined,
    enableAction: false,
    inputWidth: { width: '99%' },
    showPopularNetworkModal: false,
    popularNetwork: {},
    showWarningModal: false,
    showNetworkDetailsModal: false,
  };

  inputRpcURL = React.createRef();
  inputChainId = React.createRef();
  inputSymbol = React.createRef();
  inputBlockExplorerURL = React.createRef();

  getOtherNetworks = () => allNetworks.slice(1);

  updateNavBar = () => {
    const { navigation, route } = this.props;
    const isCustomMainnet = route.params?.isCustomMainnet;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getNavigationOptionsTitle(
        isCustomMainnet
          ? strings('app_settings.networks_default_title')
          : strings('app_settings.networks_title'),
        navigation,
        true,
        colors,
      ),
    );
  };

  /**
   * Gets the custom mainnet RPC URL from the frequent RPC list.
   *
   * @returns Custom mainnet RPC URL.
   */
  getCustomMainnetRPCURL = () => {
    const { networkConfigurations } = this.props;
    const networkConfiguration = Object.values(networkConfigurations).find(
      ({ chainId: id }) => String(id) === String(Networks.mainnet.chainId),
    );
    return networkConfiguration?.rpcUrl || '';
  };

  componentDidMount = () => {
    this.updateNavBar();
    const { route, networkConfigurations } = this.props;
    const isCustomMainnet = route.params?.isCustomMainnet;
    const networkTypeOrRpcUrl = route.params?.network;
    // if network is main, don't show popular network
    let blockExplorerUrl, chainId, nickname, ticker, editable, rpcUrl;
    // If no navigation param, user clicked on add network
    if (networkTypeOrRpcUrl) {
      if (allNetworks.find((net) => networkTypeOrRpcUrl === net)) {
        blockExplorerUrl = getEtherscanBaseUrl(networkTypeOrRpcUrl);
        const networkInformation = Networks[networkTypeOrRpcUrl];
        nickname = networkInformation.name;
        chainId = networkInformation.chainId.toString();
        editable = false;
        rpcUrl = allNetworksblockExplorerUrl(networkTypeOrRpcUrl);
        ticker =
          networkInformation.chainId.toString() !==
          NETWORKS_CHAIN_ID.LINEA_GOERLI
            ? strings('unit.eth')
            : 'LineaETH';
        // Override values if UI is updating custom mainnet RPC URL.
        if (isCustomMainnet) {
          nickname = DEFAULT_MAINNET_CUSTOM_NAME;
          rpcUrl = this.getCustomMainnetRPCURL();
        }
      } else {
        const networkConfiguration = Object.values(networkConfigurations).find(
          ({ rpcUrl }) => rpcUrl === networkTypeOrRpcUrl,
        );
        nickname = networkConfiguration.nickname;
        chainId = networkConfiguration.chainId;
        blockExplorerUrl =
          networkConfiguration.rpcPrefs &&
          networkConfiguration.rpcPrefs.blockExplorerUrl;
        ticker = networkConfiguration.ticker;
        editable = true;
        rpcUrl = networkTypeOrRpcUrl;
      }
      const initialState =
        rpcUrl + blockExplorerUrl + nickname + chainId + ticker + editable;
      this.setState({
        rpcUrl,
        blockExplorerUrl,
        nickname,
        chainId,
        ticker,
        editable,
        initialState,
      });
    } else {
      this.setState({ addMode: true });
    }
    setTimeout(() => {
      this.setState({
        inputWidth: { width: '100%' },
      });
    }, 100);
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  /**
   * Attempts to convert the given chainId to a decimal string, for display
   * purposes.
   *
   * Should be called with the props chainId whenever it is used to set the
   * component's state.
   *
   * @param {unknown} chainId - The chainId to convert.
   * @returns {string} The props chainId in decimal, or the original value if
   * it can't be converted.
   */
  getDecimalChainId(chainId) {
    if (!chainId || typeof chainId !== 'string' || !chainId.startsWith('0x')) {
      return chainId;
    }
    return parseInt(chainId, 16).toString(10);
  }

  /**
   * Validates the chain ID by checking it against the `eth_chainId` return
   * value from the given RPC URL.
   * Assumes that all strings are non-empty and correctly formatted.
   *
   * @param {string} formChainId - Non-empty, hex or decimal number string from
   * the form.
   * @param {string} parsedChainId - The parsed, hex string chain ID.
   * @param {string} rpcUrl - The RPC URL from the form.
   */
  validateChainIdOnSubmit = async (formChainId, parsedChainId, rpcUrl) => {
    let errorMessage;
    let endpointChainId;
    let providerError;

    try {
      endpointChainId = await jsonRpcRequest(rpcUrl, 'eth_chainId');
    } catch (err) {
      Logger.error('Failed to fetch the chainId from the endpoint.', err);
      providerError = err;
    }

    if (providerError || typeof endpointChainId !== 'string') {
      errorMessage = strings('app_settings.failed_to_fetch_chain_id');
    } else if (parsedChainId !== endpointChainId) {
      // Here, we are in an error state. The endpoint should always return a
      // hexadecimal string. If the user entered a decimal string, we attempt
      // to convert the endpoint's return value to decimal before rendering it
      // in an error message in the form.
      if (!formChainId.startsWith('0x')) {
        try {
          endpointChainId = new BigNumber(endpointChainId, 16).toString(10);
        } catch (err) {
          Logger.error(
            'Failed to convert endpoint chain ID to decimal',
            endpointChainId,
          );
        }
      }

      errorMessage = strings(
        'app_settings.endpoint_returned_different_chain_id',
        {
          chainIdReturned: endpointChainId,
        },
      );
    }

    if (errorMessage) {
      this.setState({ warningChainId: errorMessage });
      return false;
    }
    return true;
  };

  checkIfNetworkExists = async (rpcUrl) => {
    const checkCustomNetworks = Object.values(
      this.props.networkConfigurations,
    ).filter((item) => item.rpcUrl === rpcUrl);
    if (checkCustomNetworks.length > 0) {
      this.setState({ warningRpcUrl: strings('app_settings.network_exists') });
      return checkCustomNetworks;
    }
    const defaultNetworks = getAllNetworks().map((item) => Networks[item]);
    const checkDefaultNetworks = defaultNetworks.filter(
      (item) => Number(item.rpcUrl) === rpcUrl,
    );
    if (checkDefaultNetworks.length > 0) {
      return checkDefaultNetworks;
    }
    return [];
  };

  /**
   * Add or update network configuration, then switch networks
   */
  addRpcUrl = async () => {
    const { NetworkController, CurrencyRateController } = Engine.context;
    const {
      rpcUrl,
      chainId: stateChainId,
      nickname,
      blockExplorerUrl,
      editable,
      enableAction,
    } = this.state;
    const ticker = this.state.ticker && this.state.ticker.toUpperCase();
    const { navigation, networkOnboardedState, route } = this.props;
    const isCustomMainnet = route.params?.isCustomMainnet;
    // This must be defined before NetworkController.upsertNetworkConfiguration.
    const prevRPCURL = isCustomMainnet
      ? this.getCustomMainnetRPCURL()
      : route.params?.network;

    const shouldNetworkSwitchPopToWallet =
      route.params?.shouldNetworkSwitchPopToWallet ?? true;
    // Check if CTA is disabled
    const isCtaDisabled =
      !enableAction ||
      this.disabledByRpcUrl() ||
      this.disabledByChainId() ||
      this.disabledBySymbol();

    if (isCtaDisabled) {
      return;
    }
    // Conditionally check existence of network (Only check in Add Mode)
    const isNetworkExists = editable
      ? []
      : await this.checkIfNetworkExists(rpcUrl);

    const isOnboarded = getIsNetworkOnboarded(
      stateChainId,
      networkOnboardedState,
    );

    const nativeToken = ticker || PRIVATENETWORK;
    const networkType = nickname || rpcUrl;
    const networkUrl = sanitizeUrl(rpcUrl);
    // Prevent the network switch modal from showing post onboarding.
    const showNetworkOnboarding = isCustomMainnet ? false : isOnboarded;

    const formChainId = stateChainId.trim().toLowerCase();

    // Ensure chainId is a 0x-prefixed, lowercase hex string
    let chainId = formChainId;
    if (!chainId.startsWith('0x')) {
      chainId = `0x${parseInt(chainId, 10).toString(16)}`;
    }

    if (!(await this.validateChainIdOnSubmit(formChainId, chainId, rpcUrl))) {
      return;
    }

    if (this.validateRpcUrl() && isNetworkExists.length === 0) {
      const url = new URL(rpcUrl);

      !isprivateConnection(url.hostname) && url.set('protocol', 'https:');
      CurrencyRateController.setNativeCurrency(ticker);
      // Remove trailing slashes
      NetworkController.upsertNetworkConfiguration(
        {
          rpcUrl: url.href,
          chainId,
          ticker,
          nickname,
          rpcPrefs: {
            blockExplorerUrl,
          },
        },
        {
          setActive: true,
          // Metrics-related properties required, but the metric event is a no-op
          // TODO: Use events for controller metric events
          referrer: 'ignored',
          source: 'ignored',
        },
      );
      // TODO: Use network configuration ID to update existing entries
      // Temporary solution is to manually remove the existing network using the old RPC URL.
      const isRPCDifferent = url.href !== prevRPCURL;
      if ((editable || isCustomMainnet) && isRPCDifferent) {
        // Only remove from frequent list if RPC URL is different.
        const [prevNetworkConfigurationId] = Object.entries(
          this.props.networkConfigurations,
        ).find(
          ([, networkConfiguration]) =>
            networkConfiguration.rpcUrl === prevRPCURL,
        );
        NetworkController.removeNetworkConfiguration(
          prevNetworkConfigurationId,
        );
      }

      const analyticsParamsAdd = {
        chain_id: this.getDecimalChainId(chainId),
        source: 'Custom network form',
        symbol: ticker,
      };
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.NETWORK_ADDED,
        analyticsParamsAdd,
      );
      this.props.showNetworkOnboardingAction({
        networkUrl,
        networkType,
        nativeToken,
        showNetworkOnboarding,
      });
      isCustomMainnet
        ? navigation.navigate('OptinMetrics')
        : shouldNetworkSwitchPopToWallet
        ? navigation.navigate('WalletView')
        : navigation.goBack();
    }
  };

  /**
   * Validates rpc url, setting a warningRpcUrl if is invalid
   * It also changes validatedRpcURL to true, indicating that was validated
   */
  validateRpcUrl = async () => {
    const { rpcUrl } = this.state;
    const isNetworkExists = await this.checkIfNetworkExists(rpcUrl);
    if (!isWebUri(rpcUrl)) {
      const appendedRpc = `http://${rpcUrl}`;
      if (isWebUri(appendedRpc)) {
        this.setState({
          warningRpcUrl: strings('app_settings.invalid_rpc_prefix'),
        });
      } else {
        this.setState({
          warningRpcUrl: strings('app_settings.invalid_rpc_url'),
        });
      }
      return false;
    }

    if (isNetworkExists.length > 0) {
      return this.setState({
        validatedRpcURL: true,
        warningRpcUrl: strings('app_settings.network_exists'),
      });
    }
    const url = new URL(rpcUrl);
    const privateConnection = isprivateConnection(url.hostname);
    if (!privateConnection && url.protocol === 'http:') {
      this.setState({
        warningRpcUrl: strings('app_settings.invalid_rpc_prefix'),
      });
      return false;
    }
    this.setState({ validatedRpcURL: true, warningRpcUrl: undefined });
    return true;
  };

  /**
   * Validates that chain id is a valid integer number, setting a warningChainId if is invalid
   */
  validateChainId = () => {
    const { chainId } = this.state;
    if (!chainId) {
      return this.setState({
        warningChainId: strings('app_settings.chain_id_required'),
        validatedChainId: true,
      });
    }

    let errorMessage = '';

    // Check if it's a valid chainId format
    if (chainId.startsWith('0x')) {
      if (!regex.validChainIdHex.test(chainId)) {
        errorMessage = strings('app_settings.invalid_hex_number');
      } else if (!isPrefixedFormattedHexString(chainId)) {
        errorMessage = strings('app_settings.invalid_hex_number_leading_zeros');
      }
    } else if (!regex.validChainId.test(chainId)) {
      errorMessage = strings('app_settings.invalid_number');
    } else if (chainId.startsWith('0')) {
      errorMessage = strings('app_settings.invalid_number_leading_zeros');
    }

    if (errorMessage) {
      return this.setState({
        warningChainId: errorMessage,
        validatedChainId: true,
      });
    }

    // Check if it's a valid chainId number
    if (!isSafeChainId(toHex(chainId))) {
      return this.setState({
        warningChainId: strings('app_settings.invalid_number_range', {
          maxSafeChainId: AppConstants.MAX_SAFE_CHAIN_ID,
        }),
        validatedChainId: true,
      });
    }

    this.setState({ warningChainId: undefined, validatedChainId: true });
  };
  /**
   * Validates if symbol exists
   * @returns
   */
  validateSymbol = () => {
    const { ticker } = this.state;
    if (!ticker) {
      return this.setState({
        warningSymbol: strings('app_settings.symbol_required'),
        validatedSymbol: true,
      });
    }
    this.setState({ warningSymbol: undefined, validatedSymbol: true });
  };

  /**
   * Allows to identify if any element of the form changed, in order to enable add or save button
   */
  getCurrentState = () => {
    const {
      rpcUrl,
      blockExplorerUrl,
      nickname,
      chainId,
      ticker,
      editable,
      initialState,
    } = this.state;
    const actualState =
      rpcUrl + blockExplorerUrl + nickname + chainId + ticker + editable;
    let enableAction;
    // If concstenation of parameters changed, user changed something so we are going to enable the action button
    if (actualState !== initialState) {
      enableAction = true;
    } else {
      enableAction = false;
    }
    this.setState({ enableAction });
  };

  /**
   * Returns if action button should be disabled because of the rpc url
   * No rpc url set or rpc url set but, rpc url has not been validated yet or there is a warning for rpc url
   */
  disabledByRpcUrl = () => {
    const { rpcUrl, validatedRpcURL, warningRpcUrl } = this.state;
    return (
      !rpcUrl || (rpcUrl && (!validatedRpcURL || warningRpcUrl !== undefined))
    );
  };

  /**
   * Returns if action button should be disabled because of the rpc url
   * Chain ID set but, chain id has not been validated yet or there is a warning for chain id
   */
  disabledByChainId = () => {
    const { chainId, validatedChainId, warningChainId } = this.state;
    if (!chainId) return true;
    return validatedChainId && !!warningChainId;
  };

  /**
   * Returns if action button should be disabled because of the symbol field
   * Symbol field represents the ticker and needs to be set
   */
  disabledBySymbol = () => {
    const { ticker, validatedSymbol, warningSymbol } = this.state;
    if (!ticker) {
      return true;
    }
    return validatedSymbol && !!warningSymbol;
  };

  onRpcUrlChange = async (url) => {
    await this.setState({
      rpcUrl: url,
      validatedRpcURL: false,
      warningRpcUrl: undefined,
      warningChainId: undefined,
    });
    this.getCurrentState();
  };

  onNicknameChange = async (nickname) => {
    await this.setState({ nickname });
    this.getCurrentState();
  };

  onChainIDChange = async (chainId) => {
    await this.setState({ chainId, validatedChainId: false });
    this.getCurrentState();
  };

  onTickerChange = async (ticker) => {
    await this.setState({ ticker, validatedSymbol: false });
    this.getCurrentState();
  };

  onBlockExplorerUrlChange = async (blockExplorerUrl) => {
    await this.setState({ blockExplorerUrl });
    this.getCurrentState();
  };

  jumpToRpcURL = () => {
    const { current } = this.inputRpcURL;
    current && current.focus();
  };
  jumpToChainId = () => {
    const { current } = this.inputChainId;
    current && current.focus();
  };
  jumpToSymbol = () => {
    const { current } = this.inputSymbol;
    current && current.focus();
  };
  jumpBlockExplorerURL = () => {
    const { current } = this.inputBlockExplorerURL;
    current && current.focus();
  };

  switchToMainnet = () => {
    const { NetworkController, CurrencyRateController, TransactionController } =
      Engine.context;

    CurrencyRateController.setNativeCurrency('ETH');
    NetworkController.setProviderType(MAINNET);

    setTimeout(async () => {
      await TransactionController.updateIncomingTransactions();
    }, 1000);
  };

  removeRpcUrl = () => {
    const { navigation, networkConfigurations, providerConfig } = this.props;
    const { rpcUrl } = this.state;
    if (
      compareSanitizedUrl(rpcUrl, providerConfig.rpcUrl) &&
      providerConfig.type === RPC
    ) {
      this.switchToMainnet();
    }

    const entry = Object.entries(networkConfigurations).find(
      ([, networkConfiguration]) => networkConfiguration.rpcUrl === rpcUrl,
    );
    if (!entry) {
      throw new Error(`Unable to find network with RPC URL ${rpcUrl}`);
    }
    const [networkConfigurationId] = entry;
    const { NetworkController } = Engine.context;
    NetworkController.removeNetworkConfiguration(networkConfigurationId);
    navigation.goBack();
  };

  showNetworkModal = (networkConfiguration) => {
    this.setState({
      showPopularNetworkModal: true,
      popularNetwork: {
        ...networkConfiguration,
        formattedRpcUrl: networkConfiguration.warning
          ? null
          : hideKeyFromUrl(networkConfiguration.rpcUrl),
      },
    });
  };

  customNetwork = (networkTypeOrRpcUrl) => {
    const {
      rpcUrl,
      blockExplorerUrl,
      nickname,
      chainId,
      ticker,
      editable,
      addMode,
      warningRpcUrl,
      warningChainId,
      warningSymbol,
      enableAction,
      inputWidth,
    } = this.state;
    const { route } = this.props;
    const isCustomMainnet = route.params?.isCustomMainnet;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance =
      this.context.themeAppearance || themeAppearanceLight;
    const styles = createStyles(colors);

    const formatNetworkRpcUrl = (rpcUrl, chainId) => {
      const isNetworkPrePopulated = PopularList.find(
        (val) => val.rpcUrl === rpcUrl && val.chainId === chainId,
      );
      if (isNetworkPrePopulated !== undefined) {
        if (isNetworkPrePopulated.warning) {
          return null;
        }
        return hideKeyFromUrl(isNetworkPrePopulated.rpcUrl);
      }
    };
    const inputStyle = [
      styles.input,
      inputWidth,
      isCustomMainnet ? styles.onboardingInput : undefined,
    ];
    const isRPCEditable = isCustomMainnet || editable;
    const isActionDisabled =
      !enableAction ||
      this.disabledByRpcUrl() ||
      this.disabledByChainId() ||
      this.disabledBySymbol();
    const rpcActionStyle = isActionDisabled
      ? { ...styles.button, ...styles.disabledButton }
      : styles.button;

    const url = new URL(rpcUrl);
    const decimalChainId = this.getDecimalChainId(chainId);

    const selectedNetwork = {
      rpcUrl: url.href,
      chainId: decimalChainId,
      ticker,
      nickname,
      rpcPrefs: {
        blockExplorerUrl,
      },
    };

    const shouldNetworkSwitchPopToWallet =
      route.params?.shouldNetworkSwitchPopToWallet ?? true;

    return this.state.showNetworkDetailsModal ? (
      <CustomNetwork
        isNetworkModalVisible={this.state.showNetworkDetailsModal}
        closeNetworkModal={this.toggleNetworkDetailsModal}
        selectedNetwork={selectedNetwork}
        toggleWarningModal={this.toggleWarningModal}
        showNetworkModal={this.showNetworkModal}
        switchTab={this.tabView}
        shouldNetworkSwitchPopToWallet={shouldNetworkSwitchPopToWallet}
      />
    ) : (
      <SafeAreaView
        style={styles.wrapper}
        testID={NetworksViewSelectorsIDs.CONTAINER}
      >
        <KeyboardAwareScrollView style={styles.informationCustomWrapper}>
          {!networkTypeOrRpcUrl ? (
            <WarningMessage
              style={styles.warningContainer}
              warningMessage={strings('networks.malicious_network_warning')}
            />
          ) : null}
          <View style={styles.scrollWrapper}>
            <Text style={styles.label}>
              {strings('app_settings.network_name_label')}
            </Text>
            <TextInput
              style={inputStyle}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={nickname}
              editable={editable}
              onChangeText={this.onNicknameChange}
              placeholder={strings('app_settings.network_name_placeholder')}
              placeholderTextColor={colors.text.muted}
              onSubmitEditing={this.jumpToRpcURL}
              {...generateTestId(Platform, INPUT_NETWORK_NAME)}
              keyboardAppearance={themeAppearance}
            />
            <Text style={styles.label}>
              {strings('app_settings.network_rpc_url_label')}
            </Text>
            <TextInput
              ref={this.inputRpcURL}
              style={[styles.input, inputWidth]}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={formatNetworkRpcUrl(rpcUrl, chainId) || rpcUrl}
              editable={isRPCEditable}
              onChangeText={this.onRpcUrlChange}
              onBlur={this.validateRpcUrl}
              placeholder={strings('app_settings.network_rpc_placeholder')}
              placeholderTextColor={colors.text.muted}
              onSubmitEditing={this.jumpToChainId}
              {...generateTestId(Platform, INPUT_RPC_URL_FIELD)}
              keyboardAppearance={themeAppearance}
            />
            {warningRpcUrl && (
              <View
                style={styles.warningContainer}
                testID={RPC_WARNING_BANNER_ID}
              >
                <Text style={styles.warningText}>{warningRpcUrl}</Text>
              </View>
            )}

            <Text style={styles.label}>
              {strings('app_settings.network_chain_id_label')}
            </Text>
            <TextInput
              ref={this.inputChainId}
              style={inputStyle}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={chainId}
              editable={editable}
              onChangeText={this.onChainIDChange}
              onBlur={this.validateChainId}
              placeholder={strings('app_settings.network_chain_id_placeholder')}
              placeholderTextColor={colors.text.muted}
              onSubmitEditing={this.jumpToSymbol}
              keyboardType={'numbers-and-punctuation'}
              {...generateTestId(Platform, INPUT_CHAIN_ID_FIELD)}
              keyboardAppearance={themeAppearance}
            />
            {warningChainId ? (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>{warningChainId}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>
              {strings('app_settings.network_symbol_label')}
            </Text>
            <TextInput
              ref={this.inputSymbol}
              style={inputStyle}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={ticker}
              editable={editable}
              onChangeText={this.onTickerChange}
              onBlur={this.validateSymbol}
              placeholder={strings('app_settings.network_symbol_label')}
              placeholderTextColor={colors.text.muted}
              onSubmitEditing={this.jumpBlockExplorerURL}
              {...generateTestId(Platform, NETWORKS_SYMBOL_INPUT_FIELD)}
              keyboardAppearance={themeAppearance}
            />

            {warningSymbol ? (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>{warningSymbol}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>
              {strings('app_settings.network_block_explorer_label')}
            </Text>
            <TextInput
              ref={this.inputBlockExplorerURL}
              style={inputStyle}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={blockExplorerUrl}
              editable={editable}
              onChangeText={this.onBlockExplorerUrlChange}
              placeholder={strings(
                'app_settings.network_block_explorer_placeholder',
              )}
              {...generateTestId(Platform, BLOCK_EXPLORER_FIELD)}
              placeholderTextColor={colors.text.muted}
              onSubmitEditing={this.toggleNetworkDetailsModal}
              keyboardAppearance={themeAppearance}
            />
          </View>
          {isCustomMainnet ? (
            <Button
              variant={ButtonVariants.Primary}
              onPress={this.addRpcUrl}
              style={rpcActionStyle}
              label={strings('app_settings.networks_default_cta')}
              size={ButtonSize.Lg}
              disabled={isActionDisabled}
              width={ButtonWidthTypes.Full}
            />
          ) : (
            (addMode || editable) && (
              <View style={styles.buttonsWrapper}>
                {editable ? (
                  <View style={styles.editableButtonsContainer}>
                    <Button
                      size={ButtonSize.Lg}
                      variant={ButtonVariants.Secondary}
                      isDanger
                      onPress={this.removeRpcUrl}
                      testID={REMOVE_NETWORK_BUTTON}
                      style={{ ...styles.button, ...styles.cancel }}
                      label={strings('app_settings.delete')}
                    />
                    <Button
                      size={ButtonSize.Lg}
                      variant={ButtonVariants.Primary}
                      onPress={this.addRpcUrl}
                      testID={NetworksViewSelectorsIDs.ADD_NETWORKS_BUTTON}
                      style={styles.button}
                      label={strings('app_settings.network_save')}
                      isDisabled={isActionDisabled}
                    />
                  </View>
                ) : (
                  <View style={styles.buttonsContainer}>
                    <Button
                      size={ButtonSize.Lg}
                      variant={ButtonVariants.Primary}
                      onPress={this.toggleNetworkDetailsModal}
                      testID={
                        NetworksViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON
                      }
                      style={styles.button}
                      label={strings('app_settings.network_add')}
                      isDisabled={isActionDisabled}
                      width={ButtonWidthTypes.Full}
                    />
                  </View>
                )}
              </View>
            )
          )}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  };

  onCancel = () =>
    this.setState({ showPopularNetworkModal: false, popularNetwork: {} });

  toggleWarningModal = () =>
    this.setState({ showWarningModal: !this.state.showWarningModal });

  toggleNetworkDetailsModal = async () => {
    const { rpcUrl, chainId: stateChainId } = this.state;
    const formChainId = stateChainId.trim().toLowerCase();

    // Ensure chainId is a 0x-prefixed, lowercase hex string
    let chainId = formChainId;
    if (!chainId.startsWith('0x')) {
      chainId = `0x${parseInt(chainId, 10).toString(16)}`;
    }

    if (!(await this.validateChainIdOnSubmit(formChainId, chainId, rpcUrl))) {
      return;
    }
    this.setState({
      showNetworkDetailsModal: !this.state.showNetworkDetailsModal,
    });
  };

  goToLearnMore = () => Linking.openURL(strings('networks.learn_more_url'));

  renderTabBar = (props) => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    return (
      <View style={styles.base}>
        <DefaultTabBar
          underlineStyle={styles.tabUnderlineStyle}
          activeTextColor={colors.primary.default}
          inactiveTextColor={colors.text.muted}
          backgroundColor={colors.background.default}
          tabStyle={styles.tabStyle}
          tabPadding={16}
          textStyle={styles.textStyle}
          {...props}
        />
      </View>
    );
  };

  render() {
    const { route } = this.props;
    const networkTypeOrRpcUrl = route.params?.network;
    const shouldNetworkSwitchPopToWallet =
      route.params?.shouldNetworkSwitchPopToWallet ?? true;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <SafeAreaView
        style={styles.wrapper}
        testID={NetworksViewSelectorsIDs.CONTAINER}
      >
        <KeyboardAwareScrollView style={styles.informationWrapper}>
          {networkTypeOrRpcUrl ? (
            this.customNetwork(networkTypeOrRpcUrl)
          ) : (
            <ScrollableTabView
              tabBarTextStyle={styles.tabLabelStyle}
              renderTabBar={this.renderTabBar}
              ref={(tabView) => {
                this.tabView = tabView;
              }}
            >
              <View
                tabLabel={strings('app_settings.popular')}
                key={AppConstants.ADD_CUSTOM_NETWORK_POPULAR_TAB_ID}
                style={styles.networksWrapper}
                testID={POPULAR_NETWORKS_TAB_ID}
              >
                <CustomNetwork
                  isNetworkModalVisible={this.state.showPopularNetworkModal}
                  closeNetworkModal={this.onCancel}
                  selectedNetwork={this.state.popularNetwork}
                  toggleWarningModal={this.toggleWarningModal}
                  showNetworkModal={this.showNetworkModal}
                  switchTab={this.tabView}
                  shouldNetworkSwitchPopToWallet={
                    shouldNetworkSwitchPopToWallet
                  }
                />
              </View>
              <View
                tabLabel={strings('app_settings.custom_network_name')}
                key={AppConstants.ADD_CUSTOM_NETWORK_CUSTOM_TAB_ID}
                testID={CUSTOM_NETWORKS_TAB_ID}
              >
                {this.customNetwork()}
              </View>
            </ScrollableTabView>
          )}
        </KeyboardAwareScrollView>
        {this.state.showWarningModal ? (
          <InfoModal
            isVisible={this.state.showWarningModal}
            title={strings('networks.network_warning_title')}
            body={
              <Text>
                <Text style={styles.desc}>
                  {strings('networks.network_warning_desc')}
                </Text>{' '}
                <Text style={[styles.blueText]} onPress={this.goToLearnMore}>
                  {strings('networks.learn_more')}
                </Text>
              </Text>
            }
            toggleModal={this.toggleWarningModal}
          />
        ) : null}
      </SafeAreaView>
    );
  }
}

NetworkSettings.contextType = ThemeContext;
const mapDispatchToProps = (dispatch) => ({
  showNetworkOnboardingAction: ({
    networkUrl,
    networkType,
    nativeToken,
    showNetworkOnboarding,
  }) =>
    dispatch(
      showNetworkOnboardingAction({
        networkUrl,
        networkType,
        nativeToken,
        showNetworkOnboarding,
      }),
    ),
});

const mapStateToProps = (state) => ({
  providerConfig: selectProviderConfig(state),
  networkConfigurations: selectNetworkConfigurations(state),
  networkOnboardedState: state.networkOnboarded.networkOnboardedState,
});

export default connect(mapStateToProps, mapDispatchToProps)(NetworkSettings);
