import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  InlineLoading,
  Layer,
  Modal,
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
import { useLayoutType, isDesktop, usePagination, ErrorState, showModal, EmptyCard } from '@openmrs/esm-framework';
import { useBillableCommodities, useBillableServices } from '../billable-services/billable-service.resource';
import styles from '../billable-services/billable-services.scss';
import AddBillableStock from './add-billable-commodity.component';
import classNames from 'classnames';
import DeleteBillableCommodity from './delete-billable-commodity.component';

const BillableStock = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'lg' : 'sm';
  const pageSizes = [10, 20, 30, 40, 50];
  const [pageSize, setPageSize] = useState(10);

  const { billableCommodities: chargeItems, isLoading, isValidating, error } = useBillableCommodities();

  const [searchString, setSearchString] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const headerData = [
    { header: t('itemName', 'Item Name'), key: 'itemName' },
    { header: t('price', 'Price'), key: 'price' },
    { header: t('paymentMode', 'Payment Mode'), key: 'paymentMode' },
    { header: t('actions', 'Actions'), key: 'actions' },
  ];

  const launchBillableCommoditiesForm = useCallback(() => {
    const dispose = showModal('charge-item-modal', {
      editingItem: null,
      onClose: () => dispose(),
    });
  }, []);

  const searchResults = useMemo(() => {
    if (!chargeItems) return [];
    if (searchString.trim() === '') return chargeItems;

    const search = searchString.toLowerCase();
    return chargeItems.filter((item) => Object.values(item).some((val) => `${val}`.toLowerCase().includes(search)));
  }, [searchString, chargeItems]);

  const { goTo, results: paginatedList, currentPage } = usePagination(searchResults, pageSize);
  const rowData = [];

  if (paginatedList) {
    paginatedList.forEach((item, index) => {
      rowData.push({
        id: `${index}`,
        uuid: item.uuid,
        itemName: item.item || '--',
        price: item.price ?? '--',
        paymentMode: item.paymentMode?.name || '--',
        actions: (
          <TableCell>
            <OverflowMenu size="sm" flipped>
              <OverflowMenuItem
                itemText={t('editBillableCommodity', 'Edit billable commodity')}
                onClick={() => handleEditItem(item)}
              />
              <div className={styles.deleteItemContainer}>
                <OverflowMenuItem
                  itemText={t('deleteBillableCommodity', 'Delete billable commodity')}
                  onClick={() => handleDeleteItem(item)}
                />
              </div>
            </OverflowMenu>
          </TableCell>
        ),
      });
    });
  }

  const handleSearch = useCallback(
    (e) => {
      goTo(1);
      setSearchString(e.target.value);
    },
    [goTo],
  );

  const handleEditItem = useCallback((item) => {
    setEditingItem(item);
    setShowEditModal(true);
  }, []);

  const handleDeleteItem = useCallback((item) => {
    setDeletingItem(item);
    setShowDeleteModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowEditModal(false);
    setEditingItem(null);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setDeletingItem(null);
  }, []);

  if (isLoading) {
    return <InlineLoading status="active" iconDescription="Loading" description="Loading data..." />;
  }
  if (error) {
    return <ErrorState headerTitle={t('billableCommodity', 'Billable commodity')} error={error} />;
  }
  if (!chargeItems || chargeItems.length === 0) {
    return (
      <EmptyCard
        displayText={t('billableCommodity', 'Billable commodity')}
        headerTitle={t('billableCommodity', 'Billable commodity')}
        launchForm={launchBillableCommoditiesForm}
      />
    );
  }

  return (
    <>
      <div className={styles.serviceContainer}>
        <FilterableTableHeader
          handleSearch={handleSearch}
          isValidating={isValidating}
          layout={layout}
          responsiveSize={responsiveSize}
          t={t}
          onAddNew={() => setShowEditModal(true)}
        />
        <DataTable
          isSortable
          rows={rowData}
          headers={headerData}
          size={responsiveSize}
          useZebraStyles={rowData?.length > 1}>
          {({ rows, headers, getRowProps, getTableProps }) => (
            <TableContainer>
              <Table {...getTableProps()} aria-label="charge item list">
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader key={header.key}>{header.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} {...getRowProps({ row })}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
        <Pagination
          forwardText="Next page"
          backwardText="Previous page"
          page={currentPage}
          pageSize={pageSize}
          pageSizes={[10, 20, 30, 40, 50]}
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

      {showEditModal && (
        <Modal
          open={showEditModal}
          modalHeading={t('billableCommodity', 'Billable commodity')}
          primaryButtonText={null}
          secondaryButtonText={t('cancel', 'Cancel')}
          onRequestClose={closeModal}
          onSecondarySubmit={closeModal}
          size="lg"
          passiveModal={true}>
          <AddBillableStock editingItem={editingItem} onClose={closeModal} />
        </Modal>
      )}

      {showDeleteModal && (
        <Modal
          open={showDeleteModal}
          modalHeading={t('deletebillableCommodity', 'Delete Billable commodity')}
          primaryButtonText={null}
          secondaryButtonText={t('cancel', 'Cancel')}
          onRequestClose={closeDeleteModal}
          onSecondarySubmit={closeDeleteModal}
          size="md"
          passiveModal={true}>
          <DeleteBillableCommodity deletingItem={deletingItem} onClose={closeDeleteModal} />
        </Modal>
      )}
    </>
  );
};

function FilterableTableHeader({ layout, handleSearch, isValidating, responsiveSize, t, onAddNew }) {
  return (
    <>
      <div className={styles.headerContainer}>
        <div
          className={classNames({
            [styles.tabletHeading]: !isDesktop(layout),
            [styles.desktopHeading]: isDesktop(layout),
          })}>
          <h4>{t('commodityList', 'Commodity list')}</h4>
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
          size={responsiveSize}
        />
        <Button
          size={responsiveSize}
          kind="primary"
          renderIcon={(props) => <ArrowRight size={16} {...props} />}
          onClick={onAddNew}
          iconDescription={t('addNewCommodity', 'Add new commodity')}>
          {t('addNewCommodity', 'Add new commodity')}
        </Button>
      </div>
    </>
  );
}

export default BillableStock;
