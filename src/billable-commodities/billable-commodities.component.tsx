import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import {
  Button,
  DataTable,
  InlineLoading,
  Layer,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  Search,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';
import {
  useLayoutType,
  isDesktop,
  usePagination,
  ErrorState,
  EmptyCard,
  launchWorkspace2,
} from '@openmrs/esm-framework';
import { type BillableCommodity } from '../types/index';
import { useBillableCommodities } from '../billable-services/billable-service.resource';
import styles from '../billable-services/billable-services.scss';

const BillableCommodities = () => {
  const { t } = useTranslation();
  const { billableCommodities, isLoading, isValidating, error, mutate } = useBillableCommodities();
  const layout = useLayoutType();
  const [searchString, setSearchString] = useState('');
  const responsiveSize = isDesktop(layout) ? 'lg' : 'sm';
  const pageSizes = [10, 20, 30, 40, 50];
  const [pageSize, setPageSize] = useState(10);

  const headerData = [
    {
      header: t('itemName', 'Item Name'),
      key: 'itemName',
    },
    {
      header: t('shortName', 'Short Name'),
      key: 'shortName',
    },
    {
      header: t('paymentMode', 'Payment Mode'),
      key: 'paymentMode',
    },
    {
      header: t('price', 'Price'),
      key: 'price',
    },
  ];

  const launchBillableCommoditiesForm = useCallback(() => {
    launchWorkspace2('billable-commodity-form', {
      onWorkspaceClose: mutate,
    });
  }, [mutate]);

  const searchResults: BillableCommodity[] = useMemo(() => {
    const flatBillableCommodities = Array.isArray(billableCommodities)
      ? billableCommodities.flat()
      : billableCommodities;

    if (flatBillableCommodities !== undefined && flatBillableCommodities.length > 0) {
      if (searchString && searchString.trim() !== '') {
        const search = searchString.toLowerCase();
        return flatBillableCommodities.filter((commodity: BillableCommodity) =>
          Object.entries(commodity).some(([header, value]) => {
            return header === 'uuid' ? false : `${value}`.toLowerCase().includes(search);
          }),
        );
      }
    }
    return flatBillableCommodities;
  }, [searchString, billableCommodities]);

  const { goTo, results: paginatedList, currentPage } = usePagination(searchResults, pageSize);
  const rowData = [];

  if (paginatedList) {
    paginatedList.forEach((commodity) => {
      const c = {
        id: commodity.uuid,
        uuid: commodity.uuid,
        itemName: commodity.item || '--',
        shortName: commodity.shortName || '--',
        paymentMode: commodity?.paymentMode?.name || '--',
        price: '--',
      };
      c.price =
        commodity.price != null && commodity.paymentMode?.name
          ? `${commodity.paymentMode.name} (${commodity.price})`
          : '--';
      rowData.push(c);
    });
  }

  const handleSearch = useCallback(
    (e) => {
      goTo(1);
      setSearchString(e.target.value);
    },
    [goTo, setSearchString],
  );

  const handleEditCommodity = useCallback(
    (commodity: BillableCommodity) => {
      launchWorkspace2('billable-commodity-form', {
        itemToEdit: commodity,
        onWorkspaceClose: mutate,
      });
    },
    [mutate],
  );

  if (isLoading) {
    return <InlineLoading status="active" iconDescription="Loading" description="Loading data..." />;
  }
  if (error) {
    return <ErrorState headerTitle={t('billableCommodity', 'Billable Commodity')} error={error} />;
  }
  if (billableCommodities.length === 0) {
    return (
      <EmptyCard
        displayText={t('billableCommodity', 'Billable Commodity')}
        headerTitle={t('billableCommodity', 'Billable Commodity')}
        launchForm={launchBillableCommoditiesForm}
      />
    );
  }

  return (
    <>
      {billableCommodities?.length > 0 ? (
        <div className={styles.serviceContainer}>
          <FilterableTableHeader
            handleSearch={handleSearch}
            isValidating={isValidating}
            layout={layout}
            responsiveSize={responsiveSize}
            searchString={searchString}
            t={t}
            launchForm={launchBillableCommoditiesForm}
          />
          <DataTable
            isSortable
            rows={rowData}
            headers={headerData}
            size={responsiveSize}
            useZebraStyles={rowData?.length > 1 ? true : false}
            overflowMenuOnHover={isDesktop(layout)}>
            {({ rows, headers, getRowProps, getTableProps, getHeaderProps }) => (
              <TableContainer>
                <Table {...getTableProps()} aria-label="commodity list">
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader
                          {...getHeaderProps({
                            header,
                          })}
                          key={header.key}>
                          {header.header}
                        </TableHeader>
                      ))}
                      <TableHeader aria-label={t('actions', 'Actions')} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.id}
                        {...getRowProps({
                          row,
                        })}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                        <TableCell className="cds--table-column-menu">
                          <OverflowMenu size="lg" flipped>
                            <OverflowMenuItem
                              className={styles.menuItem}
                              itemText={t('editBillableCommodity', 'Edit billable commodity')}
                              onClick={() =>
                                handleEditCommodity(paginatedList.find((commodity) => commodity.uuid === row.id))
                              }
                            />
                          </OverflowMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
          {searchResults?.length === 0 && (
            <div className={styles.filterEmptyState}>
              <Layer level={0}>
                <Tile className={styles.filterEmptyStateTile}>
                  <p className={styles.filterEmptyStateContent}>
                    {t('noMatchingCommoditiesToDisplay', 'No matching commodities to display')}
                  </p>
                  <p className={styles.filterEmptyStateHelper}>{t('checkFilters', 'Check the filters above')}</p>
                </Tile>
              </Layer>
            </div>
          )}
          <Pagination
            forwardText="Next page"
            backwardText="Previous page"
            page={currentPage}
            pageSize={pageSize}
            pageSizes={pageSizes}
            totalItems={searchResults?.length}
            className={styles.pagination}
            size={responsiveSize}
            onChange={({ pageSize: newPageSize, page: newPage }) => {
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
              }
              if (newPage !== currentPage) {
                goTo(newPage);
              }
            }}
          />
        </div>
      ) : (
        <EmptyCard
          launchForm={launchBillableCommoditiesForm}
          displayText={t('noCommoditiesToDisplay', 'There are no commodities to display')}
          headerTitle={t('billableCommodity', 'Billable Commodity')}
        />
      )}
    </>
  );
};

function FilterableTableHeader({ layout, handleSearch, isValidating, responsiveSize, t, searchString, launchForm }) {
  return (
    <>
      <div className={styles.headerContainer}>
        <div
          className={classNames({
            [styles.tabletHeading]: !isDesktop(layout),
            [styles.desktopHeading]: isDesktop(layout),
          })}>
          <h4>{t('commoditiesList', 'Commodities list')}</h4>
        </div>
        <div className={styles.backgroundDataFetchingIndicator}>
          <span>{isValidating ? <InlineLoading /> : null}</span>
        </div>
      </div>
      <div className={styles.actionsContainer}>
        <Search
          labelText=""
          placeholder={t('filterTable', 'Filter table')}
          onChange={handleSearch}
          value={searchString}
          size={responsiveSize}
        />
        <Button
          size={responsiveSize}
          kind="primary"
          renderIcon={(props) => <ArrowRight size={16} {...props} />}
          onClick={launchForm}
          iconDescription={t('addNewBillableCommodity', 'Add new billable commodity')}>
          {t('addNewCommodity', 'Add new commodity')}
        </Button>
      </div>
    </>
  );
}
export default BillableCommodities;
