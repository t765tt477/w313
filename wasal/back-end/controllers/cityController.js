import City from '../models/City.js';

// Public: list of active cities, used by the registration forms' city dropdown.
export const getActiveCities = async (req, res) => {
  try {
    const cities = await City.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ cities });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: full list, including inactive cities, for the management page.
export const getAllCities = async (req, res) => {
  try {
    const cities = await City.find().sort({ name: 1 });
    res.status(200).json({ cities });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: add a new city to the service coverage.
export const createCity = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'اسم المدينة مطلوب' });
    }

    const existing = await City.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'هذه المدينة مضافة بالفعل' });
    }

    const city = await City.create({ name: name.trim() });
    res.status(201).json({ message: 'تمت إضافة المدينة', city });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: rename a city and/or toggle whether it's currently offered.
export const updateCity = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    const update = {};
    if (typeof name === 'string' && name.trim()) update.name = name.trim();
    if (typeof isActive === 'boolean') update.isActive = isActive;

    const city = await City.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!city) {
      return res.status(404).json({ message: 'المدينة غير موجودة' });
    }

    res.status(200).json({ message: 'تم تحديث المدينة', city });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'يوجد مدينة أخرى بنفس الاسم' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Admin: remove a city entirely from the list.
export const deleteCity = async (req, res) => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'المدينة غير موجودة' });
    }
    res.status(200).json({ message: 'تم حذف المدينة' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
